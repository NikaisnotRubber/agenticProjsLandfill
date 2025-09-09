import com.atlassian.jira.component.ComponentAccessor

import com.onresolve.scriptrunner.runner.rest.common.CustomEndpointDelegate
import groovy.transform.BaseScript
import groovy.transform.Field
import groovy.json.JsonBuilder
import com.atlassian.jira.project.Project

import javax.ws.rs.core.MultivaluedMap
import javax.ws.rs.core.Response

// Kafka imports
import org.apache.kafka.clients.producer.KafkaProducer
import org.apache.kafka.clients.producer.ProducerRecord
import org.apache.kafka.clients.producer.ProducerConfig
import org.apache.kafka.common.serialization.StringSerializer

@BaseScript CustomEndpointDelegate delegate

// Kafka configuration
@Field static Properties kafkaProps = new Properties()
@Field static KafkaProducer<String, String> kafkaProducer = null

// Status tracking (in-memory for simplicity, consider Redis for production)
@Field static Map<String, Map> requestStatus = Collections.synchronizedMap([:])

// Initialize Kafka producer
KafkaProducer<String, String> initializeKafkaProducer() {
    if (kafkaProducer == null) {
        kafkaProps.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, "localhost:9092") // Update with your Kafka servers
        kafkaProps.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, StringSerializer.class.getName())
        kafkaProps.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, StringSerializer.class.getName())
        kafkaProps.put(ProducerConfig.ACKS_CONFIG, "all")
        kafkaProps.put(ProducerConfig.RETRIES_CONFIG, 0)
        kafkaProps.put(ProducerConfig.BATCH_SIZE_CONFIG, 16384)
        kafkaProps.put(ProducerConfig.LINGER_MS_CONFIG, 1)
        kafkaProps.put(ProducerConfig.BUFFER_MEMORY_CONFIG, 33554432)
        
        kafkaProducer = new KafkaProducer<String, String>(kafkaProps)
    }
    return kafkaProducer
}

// Async project copy endpoint
copyProject(httpMethod: "POST", groups: ["jira-administrators"]) { MultivaluedMap queryParams, String body ->
    
    long startTime = System.currentTimeMillis()
    
    def template = queryParams.getFirst('template') as String
    def targetKey = queryParams.getFirst('projectKey') as String
    targetKey = targetKey.toUpperCase()
    def targetName = queryParams.getFirst('projectName') as String
    def projectLeader = queryParams.getFirst('leadAccount') as String
    
    // Quick validation - same as original
    def checkList = template && targetKey && targetName && projectLeader ?: null
    if(checkList == null){
        def output = "Can't input null value(s)."
        return Response.serverError().entity([success: false, output: output]).build()
    }
    
    if (checkuser(projectLeader) == false){
        def output = "Project leader not found." 
        return Response.serverError().entity([success: false, output: output]).build()
    }
    
    try{
        def sourceKey = ComponentAccessor.getProjectManager().getProjectObjByName(template).getKey()
    }catch(Exception e){
        def output = "Project not found." 
        return Response.serverError().entity([success: false, output: output]).build()
    }
    def sourceKey = ComponentAccessor.getProjectManager().getProjectObjByName(template).getKey()
    
    // Generate unique task ID
    def taskId = UUID.randomUUID().toString()
    
    // Create request message
    def requestMessage = new JsonBuilder([
        taskId: taskId,
        sourceKey: sourceKey,
        targetKey: targetKey,
        targetName: targetName,
        projectLeader: projectLeader,
        timestamp: System.currentTimeMillis()
    ]).toString()
    
    try {
        // Send to Kafka topic
        KafkaProducer<String, String> producer = initializeKafkaProducer()
        ProducerRecord<String, String> record = new ProducerRecord<>(taskId, requestMessage)

        // .send() 方法是異步的，它會立即返回一個 Future 物件，而不會阻塞等待
        producer.send(record)
        def future = producer.send(record)

        
        // Initialize status tracking
        requestStatus[taskId] = [
            status: "QUEUED",
            timestamp: System.currentTimeMillis(),
            targetKey: targetKey,
            message: "Request queued for processing"
        ]
        
        long endTime = System.currentTimeMillis()
        long executionTime = endTime - startTime
        
        // Return immediately with task ID
        return Response.ok([
            success: true,
            taskId: taskId,
            status: "QUEUED",
            message: "Project copy request queued successfully",
            executionTime: executionTime
        ]).build()
        
    } catch (Exception e) {
        log.error("Failed to send message to Kafka", e)
        return Response.serverError().entity([
            success: false, 
            output: "Failed to queue request: " + e.getMessage()
        ]).build()
    }
}

// Status check endpoint
checkProjectCopyStatus(httpMethod: "GET", groups: ["jira-administrators"]) { MultivaluedMap queryParams, String body ->
    def taskId = queryParams.getFirst('taskId') as String
    
    if (!taskId) {
        return Response.serverError().entity([success: false, output: "taskId parameter is required"]).build()
    }
    
    def status = requestStatus[taskId]
    if (!status) {
        return Response.status(404).entity([success: false, output: "Task not found"]).build()
    }
    
    return Response.ok([
        success: true,
        taskId: taskId,
        status: status.status,
        targetKey: status.targetKey,
        message: status.message,
        timestamp: status.timestamp
    ]).build()
}

// Helper function to update status (used by consumer)
def updateRequestStatus(String taskId, String status, String message, String targetKey = null) {
    if (requestStatus.containsKey(taskId)) {
        requestStatus[taskId].status = status
        requestStatus[taskId].message = message
        requestStatus[taskId].timestamp = System.currentTimeMillis()
        if (targetKey) {
            requestStatus[taskId].targetKey = targetKey
        }
    }
}

def checkuser(leader){
    try{
        def String user = ComponentAccessor.userManager.getUserByName(leader as String)
    }catch(Exception e){
        return false
    }
    return true
}