// ========================================================================
// 文件: post2OA.groovy  
// 用途: Jira定时任务脚本，用于向外部OA系统发送Go-Live审批请求
// 功能: 查询符合条件的议题，按审核者分组，生成JSON并发送HTTP请求
// ========================================================================

// Jira核心API导入
import com.atlassian.jira.issue.IssueManager               // 议题管理器，提供议题的CRUD操作
import com.atlassian.jira.component.ComponentAccessor      // Jira组件访问器，访问所有Jira服务的入口点
import com.atlassian.jira.issue.MutableIssue              // 可修改议题接口，允许直接修改议题字段
import com.atlassian.jira.issue.Issue                     // 只读议题接口，提供议题数据访问

// 用户和历史记录相关导入
import com.atlassian.jira.user.ApplicationUser            // Jira用户对象，代表系统用户
import com.atlassian.jira.issue.history.ChangeItemBean   // 议题变更历史项，包含字段变更信息
import com.atlassian.jira.event.type.EventDispatchOption // 事件分发选项，控制议题更新时的事件触发

// HTTP客户端和JSON处理导入
import groovyx.net.http.HTTPBuilder                       // Groovy HTTP客户端，用于发送HTTP请求
import groovy.json.JsonGenerator                         // JSON生成器，将对象转换为JSON字符串
import static groovyx.net.http.Method.POST               // HTTP POST方法常量
import static groovyx.net.http.ContentType.JSON          // JSON内容类型常量

// Java标准库导入
import java.util.stream.Collectors                       // Java 8 Stream收集器，用于数据转换
import java.time.ZoneId                                   // 时区标识符
import java.time.DayOfWeek                               // 星期枚举
import java.time.LocalDateTime                           // 本地日期时间类
import java.time.format.DateTimeFormatter               // 日期时间格式化器
import java.time.temporal.TemporalAdjusters             // 时间调整器，用于日期计算

// ========================================================================
// 配置区域 - 集中管理所有配置参数
// ========================================================================

// Jira查询配置
def projectKey = "PMSPG"                           // 目标项目键值
def targetStatus = "Go-Live Approval"             // 目标状态名称  
def projectReviewerCfName = "Project Reviewer"    // 项目审核者自定义字段名称
def sortField = "Plan Go-live Date"               // JQL查询排序字段

// 外部系统集成配置
def targetUrl = "https://dgdvap.deltaww.com/OACWebApi/api/Route/PMS_CreateGolive"  // 目标API端点
def username = " GoLiveApproval"                   // API认证用户名
def password = "DEV5W4Ss33_53Xq"                  // API认证密码

// 获取当前执行用户和申请者ID
def jobRunnerUser = ComponentAccessor.getJiraAuthenticationContext().getLoggedInUser()  // 脚本执行者
String applyerNumericId = "@020"                   // 申请者数字ID (硬编码)
log.warn("腳本執行者 (Applyer) 為 '${jobRunnerUser.getName()}'")

// ========================================================================
// 时间计算配置 - 确定处理的时间窗口
// ========================================================================

def taipeiZone = ZoneId.of("Asia/Taipei")         // 台北时区
def now = LocalDateTime.now(taipeiZone)           // 当前台北时间

// 计算上周三 - 如果今天是周三且时间小于22点，则取前一周的周三
def lastWednesday = now.with(TemporalAdjusters.previousOrSame(DayOfWeek.WEDNESDAY))
if (now.dayOfWeek == DayOfWeek.WEDNESDAY && now.hour < 22) {
    lastWednesday = lastWednesday.minusWeeks(1)
}

// 定义处理的时间窗口 - 本周三到下周三
def startOfWeek = now.with(TemporalAdjusters.nextOrSame(DayOfWeek.WEDNESDAY))
def endOfWeek = now.with(TemporalAdjusters.next(DayOfWeek.WEDNESDAY))

// 日期格式化器
def dateOnlyFormatter = DateTimeFormatter.ofPattern("yyyy/M/d")      // 仅日期格式
def dateTimeFormatter = DateTimeFormatter.ofPattern("yyyy/M/d HH:mm") // 日期时间格式

// 生成调度任务触发日期范围字符串
String scheduleJobTriggerDate = "${startOfWeek.format(dateOnlyFormatter)}~${endOfWeek.format(dateOnlyFormatter)}"

// ========================================================================
// 辅助工具方法定义
// ========================================================================

/**
 * 安全获取自定义字段值，处理可能的异常和空值情况
 * @param issue 议题对象
 * @param cfName 自定义字段名称
 * @return 字段值或null
 */
def getSafeCfValue(Issue issue, String cfName) {
    // 通过名称查找自定义字段 - getCustomFieldObjectsByName返回匹配的字段列表
    def cfList = ComponentAccessor.getCustomFieldManager().getCustomFieldObjectsByName(cfName)
    if (cfList.isEmpty()) {
        log.warn("警告：在議題 ${issue.key} 上找不到名為 '${cfName}' 的自訂欄位。 ")
        return null
    }
    
    def cf = cfList.first()  // 取第一个匹配的字段
    def val = null
    try {
        // 获取字段值 - getCustomFieldValue可能抛出异常
        val = issue.getCustomFieldValue(cf)
    } catch (Exception e) {
        return null
    }
    
    // 处理特殊数据类型 - 将SQL时间戳转换为LocalDateTime
    if (val instanceof java.sql.Timestamp) {
        val = val.toLocalDateTime()
    }

    return val
}

/**
 * 将自定义字段值转换为JSON安全的字符串
 * 处理集合、映射等复杂数据类型
 * @param issue 议题对象  
 * @param cfName 自定义字段名称
 * @return JSON安全的字符串或null
 */
String getJsonSafeString(Issue issue, String cfName) {
    def rawValue = getSafeCfValue(issue, cfName)
    
    if (rawValue == null) return null
    
    // 处理集合类型 - 如多选字段
    if (rawValue instanceof java.util.Collection) {
        return rawValue.collect { it?.toString() }.join(', ')
    }
    
    // 处理映射类型 - 如级联选择字段
    if (rawValue instanceof java.util.Map) {
        def stringEntries = rawValue.collect { key, value ->
            def safeKey = key?.toString() ?: "null_key" 
            def safeValue = value?.toString() ?: "null_value"
            return "'${safeKey}':'${safeValue}'"
        }
        return "{${stringEntries.join(', ')}}"
    }
    
    return rawValue.toString()
}

/**
 * 从映射类型字段值中安全获取指定索引的值
 * @param issue 议题对象
 * @param cfName 自定义字段名称  
 * @param index 索引位置
 * @return 指定位置的值或null
 */
def getSafeValFromMap(Issue issue, String cfName, Integer index) {
    def rawValue = getSafeCfValue(issue, cfName)
    
    if (!(rawValue instanceof java.util.Map)) return null
    
    // 将映射的值转换为列表
    def vals = rawValue.collect { key, value ->
        return value?.toString()
    }

    try {
        return vals.get(index)
    } catch (Exception e){
        return null
    }
}

/**
 * 根据是否为微表单获取平台和模块值
 * 处理常规表单和微表单的字段差异
 * @param issue 议题对象
 * @param cfName 字段名称
 * @param index 索引
 * @return 平台/模块值
 */
def getSafePlatAndModVal(Issue issue, String cfName, Integer index) {
    def isMicroForm = getSafeCfValue(issue, "Is Micro-E-form(SFS Form)").toString()
    if(isMicroForm == "No") return getSafeValFromMap(issue, cfName, index)
    
    // 微表单使用不同的字段名称
    cfName = "Correspond Micro-Form"
    return getSafeValFromMap(issue, cfName, index)
}

/**
 * 合并两个字符串的最长公共子串
 * 用于智能合并用户显示名称和用户名
 * @param strA 第一个字符串
 * @param strB 第二个字符串  
 * @return 合并后的字符串
 */
String MergeLongestCommonSubstring(String strA, String strB) {
    // 处理null或空字符串的边界情况
    if (!strA) return strB ?: ""
    if (!strB) return strA ?: ""

    // 处理完全包含的情况
    if (strA.contains(strB)) return strA
    if (strB.contains(strA)) return strB

    // 查找A的后缀与B的前缀的最大重叠
    int checkLen = Math.min(strA.length(), strB.length())
    for (int len = checkLen; len > 0; len--) {
        String suffixA = strA.substring(strA.length() - len)
        String prefixB = strB.substring(0, len)

        if (suffixA.equals(prefixB)) {
            return strA + strB.substring(len)
        }
    }

    // 查找B的后缀与A的前缀的最大重叠
    for (int len = checkLen; len > 0; len--) {
        String suffixB = strB.substring(strB.length() - len)
        String prefixA = strA.substring(0, len)

        if (suffixB.equals(prefixA)) {
            return strB + strA.substring(len)
        }
    }

    // 无重叠时简单拼接
    return "${strA} ${strB}"
}

/**
 * 安全获取用户字段的用户名
 * 处理单用户和多用户字段
 * @param issue 议题对象
 * @param cfName 用户字段名称
 * @return 用户名字符串
 */
def getSafeUsername(Issue issue, String cfName) {
    def userObject = getSafeCfValue(issue, cfName)

    // 处理多用户字段 - 返回逗号分隔的用户名列表
    if (userObject instanceof java.util.Collection) {
        return userObject.collect { user -> user?.getName() }.join(', ')
    }

    // 处理单用户字段
    userObject = userObject as ApplicationUser
    if (userObject) {
        String displayName = userObject.getName()  // 获取用户名
        return displayName
    } else {
        return null
    }
}

/**
 * 获取议题转换到指定状态的最近时间
 * 通过分析议题变更历史来确定状态转换时间
 * @param issue 议题对象
 * @param targetStatusName 目标状态名称
 * @return 转换时间或null
 */
LocalDateTime getLastTransitionDateToStatus(Issue issue, String targetStatusName) {
    // 获取变更历史管理器和状态变更记录
    def changeHistoryManager = ComponentAccessor.getChangeHistoryManager()
    List<ChangeItemBean> statusChanges = changeHistoryManager.getChangeItemsForField(issue, "status")
    
    if (!statusChanges) {
        // 如果没有状态变更历史，检查当前状态是否就是目标状态
        if (issue.status.name == targetStatusName) return issue.getCreated().toLocalDateTime()
        return null
    }

    // 反转列表以从最近的变更开始查找
    Collections.reverse(statusChanges)
    
    // 查找转换到目标状态的变更记录 - getToString()返回转换后的状态名称
    def targetChange = statusChanges.find { it.getToString() == targetStatusName }
    log.warn(targetChange)
    
    if (targetChange) {
        return targetChange.getCreated().toLocalDateTime()
    } else {
        // 再次检查创建时的状态
        if (issue.status.name == targetStatusName) return issue.getCreated().toLocalDateTime()
    }
    
    return null
}

// ========================================================================