// ========================================================================
// 文件: eformPoseRecv.groovy
// 用途: Jira Script Runner REST端点，用于处理外部系统的审批请求
// 功能: 接收外部系统POST请求，执行工作流转换，更新自定义字段
// ========================================================================

// Jira核心API导入
import com.atlassian.jira.util.ErrorCollection                // 错误收集接口，用于收集和管理验证错误
import com.atlassian.jira.component.ComponentAccessor          // Jira组件访问器，提供对所有Jira服务的访问入口
import com.atlassian.jira.bc.issue.IssueService               // 议题业务逻辑服务，处理议题相关的CRUD操作和验证
import com.atlassian.jira.bc.ServiceResultImpl                // 服务结果实现类，包含操作结果和错误信息
import com.atlassian.jira.issue.Issue                         // 议题接口，代表Jira中的一个议题
import com.atlassian.jira.issue.IssueInputParameters          // 议题输入参数类，用于创建/更新议题时传递参数
import com.atlassian.jira.issue.MutableIssue                  // 可修改的议题实现类，允许修改议题字段
import com.atlassian.jira.issue.fields.CustomField            // 自定义字段接口，代表Jira中的自定义字段
import com.atlassian.jira.workflow.JiraWorkflow               // Jira工作流对象，包含工作流配置和状态

// Script Runner和工作流相关导入
import com.onresolve.scriptrunner.runner.rest.common.CustomEndpointDelegate  // Script Runner REST端点委托
import com.opensymphony.workflow.loader.ActionDescriptor      // 工作流动作描述符，定义工作流转换

// Groovy和Web服务导入
import groovy.transform.BaseScript                            // Groovy基础脚本注解
import groovy.json.JsonSlurper                              // JSON解析器
import javax.ws.rs.core.MultivaluedMap                      // JAX-RS多值映射接口
import javax.ws.rs.core.Response                           // JAX-RS HTTP响应对象
import javax.servlet.http.HttpServletRequest               // HTTP请求对象

// ========================================================================
// 全局变量初始化
// ========================================================================

// 初始化标准响应结构 - 用于统一API响应格式
def result = [
    code: "",      // 响应状态码
    message: "",   // 响应消息
]

// ========================================================================
// 工具方法定义 - 用于错误处理和响应生成
// ========================================================================

/**
 * 创建标准化错误响应
 * @param status 状态字符串 (用于日志记录)
 * @param message 错误消息
 * @param httpStatus HTTP状态码
 * @return JAX-RS Response对象
 */
def createErrorResponse = { String status, String message, int httpStatus ->
    result.code = httpStatus.toString()
    result.message = message
    log.warn(message)  // 记录警告日志
    return Response.status(httpStatus).entity(result).build()
}

/**
 * 处理Jira服务操作结果的通用方法
 * @param serviceResult Jira服务返回的结果对象 (如IssueService.IssueResult)
 * @param context 上下文描述，用于错误消息
 * @param httpStatus 失败时的HTTP状态码，默认500
 * @param isPartial 是否为部分失败(true=记录警告但不中断流程, false=抛出错误中断流程)
 * @return Map包含valid标志和可能的response对象
 */
def handleServiceResult = { ServiceResultImpl serviceResult, String context, int httpStatus = 500, boolean isPartial = false ->
    // 检查服务结果是否有效 - 使用反射检查isValid方法存在性，因为不同服务返回类型可能不同
    if (serviceResult?.respondsTo('isValid') && !serviceResult.isValid()) {
        // 提取错误集合 - 同样使用反射访问，保证代码健壮性
        def ec = serviceResult.respondsTo('getErrorCollection') ? serviceResult.errorCollection : null
        
        // 将ErrorCollection转换为可读的错误消息
        def errorMsg = 'Unknown error.'
        if (ec) {
            // 字段特定错误 - ec.errors是Map<String, String>格式
            List<String> fieldErrors = ec.errors?.collect { k, v -> "${k}: ${v}".toString() } ?: []
            // 通用错误消息 - ec.errorMessages是List<String>格式  
            List<String> generalErrors = ec.errorMessages?.collect { it.toString() } ?: []
            errorMsg = (fieldErrors + generalErrors).join('; ') ?: 'Unknown error.'
        }
        
        if (isPartial) {
            // 部分失败 - 记录警告但允许流程继续
            result.code = httpStatus.toString()
            result.message = "${context}，但将繼續。錯誤: ${errorMsg}"
            log.warn("${context}: ${errorMsg}")
            return [valid: false, partial: true]
        }
        // 完全失败 - 返回错误响应
        return [valid: false, response: createErrorResponse('failed', "${context}: ${errorMsg}", httpStatus)]
    }
    [valid: true]  // 操作成功
}

// ========================================================================
// REST端点定义 - 使用Script Runner的CustomEndpointDelegate
// ========================================================================

@BaseScript CustomEndpointDelegate delegate
oA2JiraRecvTest(httpMethod: "POST", groups: ["jira-administrators"]) { MultivaluedMap queryParams, String body, HttpServletRequest request ->
    
    // ========================================================================
    // 第一步: 初始化Jira服务组件
    // ========================================================================
    
    // 获取核心Jira服务 - ComponentAccessor是访问所有Jira服务的入口点
    def issueService = ComponentAccessor.getIssueService()           // 议题服务：处理议题CRUD和工作流转换
    def customFieldManager = ComponentAccessor.getCustomFieldManager() // 自定义字段管理器：管理自定义字段定义和值
    def workflowManager = ComponentAccessor.getWorkflowManager()     // 工作流管理器：管理工作流定义和操作
    def loggedInUser = ComponentAccessor.getJiraAuthenticationContext().getLoggedInUser() // 当前登录用户

    // ========================================================================
    // 第二步: 请求体验证和解析
    // ========================================================================
    
    // 验证请求体不为空
    if (!body || body.trim().isEmpty()) { 
        return createErrorResponse("failed", "請求體不能為空 (Request body cannot be empty)", 400) 
    }
    
    // 解析JSON请求体 - 使用try-catch捕获JSON解析异常
    Map parsedBody
    try { 
        parsedBody = new JsonSlurper().parseText(body) as Map 
    } catch (Exception e) { 
        return createErrorResponse("failed", "解析請求 Body 時發生錯誤 (Invalid JSON format): ${e.getMessage()}", 400) 
    }

    // ========================================================================
    // 第三步: 提取和验证请求参数
    // ========================================================================
    
    // 提取议题键值 - 必需参数
    String issueKey = parsedBody?."itsysdng_key"
    if (!issueKey) { 
        return createErrorResponse("failed", "請求體中必須包含 'issue_key'", 400) 
    }
    
    // 提取和验证审批状态 - 只接受"Approval"或"Reject"
    String approvalStatus = parsedBody?."Approval_result"
    if (!approvalStatus || !(approvalStatus in ["Approval", "Reject"])) { 
        return createErrorResponse("failed", "approval 屬性缺失或值無效 (必須是 'Approval' 或 'Reject')", 400) 
    }
    
    // 提取拒绝原因 - 可选参数，仅在拒绝时使用
    String rejReason = parsedBody?."Reject_reason"
    log.warn("處理參數: issue_key='${issueKey}', approval='${approvalStatus}', reject_reason='${rejReason}'")

    // ========================================================================
    // 第四步: 获取Jira议题对象
    // ========================================================================
    
    // 使用IssueService获取议题 - 这会检查用户权限和议题存在性
    IssueService.IssueResult getIssueServiceResult = issueService.getIssue(loggedInUser, issueKey)
    def issueOutcome = handleServiceResult(getIssueServiceResult, "找不到 Issue '${issueKey}' 或無權限查看", 404)
    if (!issueOutcome.valid) return issueOutcome.response
    
    // 获取可修改的议题对象
    MutableIssue issue = getIssueServiceResult.getIssue()

    // ========================================================================
    // 第五步: 执行工作流转换和字段更新
    // ========================================================================
    
    try {
        // --- 步骤A: 执行工作流程转换 ---
        
        // 定义审批状态到工作流转换名称的映射
        def transitionMap = [Approval: 'Approval Got', Reject: 'Rejected']
        String targetTransitionName = transitionMap[approvalStatus]
        
        // 获取当前议题的工作流和可用转换
        JiraWorkflow workflow = workflowManager.getWorkflow(issue)  // 获取议题关联的工作流
        Collection<ActionDescriptor> actions = workflow.getLinkedStep(issue.status).actions  // 获取当前状态下的可用动作
        
        // 查找目标转换动作 - 通过名称匹配，忽略大小写
        def action = actions.find { it.name.equalsIgnoreCase(targetTransitionName) }
        if (!action) return createErrorResponse('failed', "不能執行轉換 '${targetTransitionName}'。", 400)
        
        // 验证转换 - IssueService.validateTransition检查转换的合法性和字段必需性
        def validation = issueService.validateTransition(loggedInUser, issue.id, action.id, issueService.newIssueInputParameters())
        def valTrans = handleServiceResult(validation, "驗證轉換失敗", 400)
        if (!valTrans.valid) return valTrans.response
        
        // 执行转换 - 实际更改议题状态
        def transRes = issueService.transition(loggedInUser, validation)
        def transOutcome = handleServiceResult(transRes, "執行轉換失敗", 500)
        if (!transOutcome.valid) return transOutcome.response

        // 【重要】转换成功后重新获取议题对象，因为工作流转换可能改变了议题的状态和字段值
        // Issues.getByKey是Script Runner提供的便捷方法
        Issue updatedIssue = Issues.getByKey(issue.key)
        
        // --- 步骤B: 更新拒绝原因自定义字段 (仅在拒绝且有原因时) ---
        
        def rejectUpdateMessage = "" // 用于记录拒绝原因更新结果
        if (approvalStatus == 'Reject' && rejReason) {
            log.warn("檢測到拒絕原因，準備更新 'Reject Reason' 欄位...")
            
            // 通过名称查找自定义字段 - getCustomFieldObjectsByName返回匹配名称的字段列表
            CustomField rejectReasonField = customFieldManager.getCustomFieldObjectsByName('Reject Reason').first()
            
            if (rejectReasonField) {
                // 使用IssueService标准流程更新字段 - 这确保了所有验证和权限检查
                def issueInputParameters = issueService.newIssueInputParameters()  // 创建输入参数对象
                // 添加自定义字段值 - 使用字段的Long ID和字符串值
                issueInputParameters.addCustomFieldValue(rejectReasonField.idAsLong, rejReason)
                
                // 验证更新操作 - 检查字段约束和权限
                def updateValidation = issueService.validateUpdate(loggedInUser, updatedIssue.id, issueInputParameters)
                // 使用handleServiceResult处理验证，isPartial=true表示即使失败也不中断整个流程
                def updateValOutcome = handleServiceResult(updateValidation, "更新拒絕原因時驗證失敗", 500, true)

                if (updateValOutcome.valid) {
                    // 执行更新操作
                    def updateResult = issueService.update(loggedInUser, updateValidation)
                    def updateOutcome = handleServiceResult(updateResult, "更新拒絕原因時執行失敗", 500, true)
                    if (updateOutcome.valid) {
                        rejectUpdateMessage = " 拒絕原因已成功更新。"
                    } else {
                        // 如果更新执行失败，记录错误信息但不中断流程
                        rejectUpdateMessage = updateOutcome.message 
                    }
                } else {
                    rejectUpdateMessage = updateValOutcome.message
                }
            } else {
                rejectUpdateMessage = " 但找不到 'Reject Reason' 欄位，無法更新原因。"
                log.warn(rejectUpdateMessage)
            }
        }

        // --- 步骤C: 构建成功响应 ---
        
        result.code = '200'
        result.message = ""  // 可以根据需要添加成功消息
        return Response.status(200).entity(result).build()

    } catch (Exception e) {
        // 捕获所有未预期的异常，确保API始终返回合适的响应
        log.warn("內部錯誤: ${e.message}", e)
        return createErrorResponse('error', "內部錯誤: ${e.message}", 500)
    }
}