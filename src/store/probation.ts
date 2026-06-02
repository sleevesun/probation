import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface GoalItem {
    goal_id: string;
    dimension: '业绩' | '能力' | '融入';
    content: string;
    measure: string;
    goal_review?: string; // 目标回顾：员工对该项目标的完成情况自述
}

export interface EvaluationItem {
    eval_id: string;
    evaluator_name: string;
    evaluator_role: string;
    eval_type: 'self' | 'manager' | 'hrbp' | 'invited';
    content: string;
    reject_reason?: string;
    create_time: string;
}

export interface ApprovalLogItem {
    log_id: string;
    node_name: string;
    approver_name: string;
    action: '同意' | '拒绝' | '系统跳过';
    comment?: string;
    action_time: string;
}

export interface ProbationMaster {
    master_id: string;
    emp_name: string;
    emp_id: string;
    position: string;
    dept_name: string;
    parent_dept: string;
    manager_name: string;
    hrbp_name: string;
    hire_date: string;
    /**
     * 01 - 待设定目标
     * 02 - 目标待确认
     * 03 - 目标已确认
     * 04 - 待开启评估
     * 05 - 待员工自评
     * 06 - 待上级评价
     * 07 - 待发起审批
     * 08 - 审批中
     * 09 - 待发布结果
     * 10 - 结果已发布
     * 99 - 暂不发起/终止
     */
    probation_status: string;
    final_decision?: '超出预期' | '符合预期' | '不符合录用条件';
    goals: GoalItem[];
    evaluations: EvaluationItem[];
    approval_logs: ApprovalLogItem[];
    return_comment?: string;
    // 评价标志
    manager_eval_done: boolean;
    // 发布结果相关
    allow_employee_view_eval: boolean; // HRBP 是否允许员工查看评价
    result_published_time?: string;    // 发布时间
}

// ====== 状态常量 ======
export const STATUS_MAP: Record<string, string> = {
    '01': '待设定目标',
    '02': '目标待确认',
    '03': '目标已确认',
    '04': '待开启评估',
    '05': '待员工自评',
    '06': '待上级评价',
    '07': '待发起审批',
    '08': '审批中',
    '09': '待发布结果',
    '10': '结果已发布',
    '99': '暂不发起/终止'
};

export const STATUS_COLOR: Record<string, string> = {
    '01': 'default',
    '02': 'processing',
    '03': 'blue',
    '04': 'orange',
    '05': 'purple',
    '06': 'volcano',
    '07': 'cyan',
    '08': 'orange',
    '09': 'gold',
    '10': 'success',
    '99': 'default'
};

/**
 * 获取状态的详细展示文本（状态 06 仅显示"待上级评价"）
 */
export function getDetailedStatusText(record: ProbationMaster): string {
    if (record.probation_status === '06') {
        return '待上级评价';
    }
    return STATUS_MAP[record.probation_status] || record.probation_status;
}

export function getMonthsSinceHire(hireDate: string): string {
    const hire = new Date(hireDate);
    const now = new Date();
    const diffMs = now.getTime() - hire.getTime();
    const months = diffMs / (1000 * 60 * 60 * 24 * 30.44);
    return months.toFixed(1);
}

/**
 * 获取当前处理人
 */
export function getCurrentHandler(record: ProbationMaster): string {
    switch (record.probation_status) {
        case '01':
        case '05':
            return record.emp_name; // 员工处理
        case '02':
            return record.manager_name; // 上级确认
        case '04':
        case '09':
            return record.hrbp_name; // HRBP操作
        case '06':
            return record.manager_name; // 仅上级评价
        case '07':
            return record.hrbp_name; // HRBP 发起审批
        case '08':
            return '审批人A'; // 模拟转正审批流的当前审批人
        case '03':
        case '10':
        case '99':
        default:
            return '-'; // 无明确当前处理人
    }
}

// ====== Store ======
export const useProbationStore = defineStore('probation', () => {

    const records = ref<ProbationMaster[]>([
        // ---- 状态 01：待设定目标（新入职）----
        {
            master_id: 'M001', emp_name: '王明辉', emp_id: 'E1001',
            position: '前端开发工程师', dept_name: '前端组', parent_dept: '研发部',
            manager_name: '陈思远', hrbp_name: '刘建国',
            hire_date: '2025-10-15', probation_status: '01',
            goals: [],
            evaluations: [], approval_logs: [],
            manager_eval_done: false, allow_employee_view_eval: false
        },
        // ---- 状态 01：目标被退回，需要重新编辑 ----
        {
            master_id: 'M011', emp_name: '张雨萱', emp_id: 'E1011',
            position: '数据产品经理', dept_name: '数据产品组', parent_dept: '产品部',
            manager_name: '陈思远', hrbp_name: '刘建国',
            hire_date: '2025-09-20', probation_status: '01',
            return_comment: '目标描述过于笼统，请补充具体的衡量标准和预期产出。能力维度的目标建议结合实际项目来设定。',
            goals: [
                { goal_id: 'G18', dimension: '业绩', content: '完成数据平台搭建', measure: '数据平台上线并支持核心业务数据看板' },
                { goal_id: 'G19', dimension: '能力', content: '提升数据分析能力', measure: '能够独立完成数据分析报告' }
            ],
            evaluations: [], approval_logs: [],
            manager_eval_done: false, allow_employee_view_eval: false
        },
        // ---- 状态 02：目标待确认 ----
        {
            master_id: 'M002', emp_name: '李婷婷', emp_id: 'E1002',
            position: '产品经理', dept_name: '产品策划组', parent_dept: '产品部',
            manager_name: '陈思远', hrbp_name: '刘建国',
            hire_date: '2025-09-01', probation_status: '02',
            goals: [
                { goal_id: 'G1', dimension: '业绩', content: '完成首页重构项目，提升页面加载速度30%', measure: '页面 LCP 指标降至 2s 以内，通过性能测试验收' },
                { goal_id: 'G2', dimension: '融入', content: '熟悉内部系统与协同流程，参与部门周会分享', measure: '完成新人 onboarding checklist，独立完成 1 次周会分享' }
            ],
            evaluations: [], approval_logs: [],
            manager_eval_done: false, allow_employee_view_eval: false
        },
        // ---- 状态 03：目标已确认 ----
        {
            master_id: 'M008', emp_name: '陈思思', emp_id: 'E1008',
            position: 'Java开发工程师', dept_name: '服务端组', parent_dept: '研发部',
            manager_name: '陈思远', hrbp_name: '刘建国',
            hire_date: '2025-08-20', probation_status: '03',
            goals: [
                { goal_id: 'G10', dimension: '业绩', content: '完成订单模块开发', measure: '订单模块上线并稳定运行，核心接口可用性≥99.9%', goal_review: '订单模块已开发完成并通过测试，核心接口可用性达 99.95%，符合预期。' },
                { goal_id: 'G11', dimension: '融入', content: '参与 Code Review 机制建设', measure: '建立 Code Review 规范文档，每周至少 Review 3 个 PR', goal_review: '已输出 Code Review 规范文档，每周稳定 Review 4-5 个 PR，团队反馈良好。' }
            ],
            evaluations: [], approval_logs: [],
            manager_eval_done: false, allow_employee_view_eval: false
        },
        // ---- 状态 04：待开启评估 ----
        {
            master_id: 'M003', emp_name: '赵雪梅', emp_id: 'E1003',
            position: 'UI设计师', dept_name: '视觉设计组', parent_dept: '设计部',
            manager_name: '陈思远', hrbp_name: '刘建国',
            hire_date: '2025-05-01', probation_status: '04',
            goals: [
                { goal_id: 'G3', dimension: '业绩', content: '产出5套大促视觉稿，通过率≥90%', measure: '设计稿一次性通过率统计，由设计主管确认' },
                { goal_id: 'G4', dimension: '能力', content: '提升动效设计能力，完成2个动效项目', measure: '产出 2 个可落地的动效方案，经技术评审通过' }
            ],
            evaluations: [], approval_logs: [],
            manager_eval_done: false, allow_employee_view_eval: false
        },
        // ---- 状态 05：待员工自评 ----
        {
            master_id: 'M004', emp_name: '周晓峰', emp_id: 'E1004',
            position: '测试工程师', dept_name: '质量保障组', parent_dept: '测试部',
            manager_name: '陈思远', hrbp_name: '刘建国',
            hire_date: '2025-04-15', probation_status: '05',
            goals: [
                { goal_id: 'G5', dimension: '业绩', content: '测试通过率达到 99%，覆盖率达到 85%', measure: '按月统计自动化测试通过率与覆盖率，输出测试报告' },
                { goal_id: 'G16', dimension: '能力', content: '掌握性能测试工具 JMeter，完成 2 个核心接口的性能压测', measure: '独立完成 JMeter 脚本编写，输出性能测试报告，核心接口 QPS 达到预期指标' },
                { goal_id: 'G17', dimension: '融入', content: '参与测试流程优化，推动缺陷管理规范化', measure: '提交至少 1 份流程优化建议，缺陷跟踪闭环率达到 95% 以上' }
            ],
            evaluations: [], approval_logs: [],
            manager_eval_done: false, allow_employee_view_eval: false
        },
        // ---- 状态 06：待上级评价（仅上级未评价）----
        {
            master_id: 'M005', emp_name: '吴芳芳', emp_id: 'E1005',
            position: '后端开发工程师', dept_name: '服务端组', parent_dept: '研发部',
            manager_name: '陈思远', hrbp_name: '刘建国',
            hire_date: '2025-03-01', probation_status: '06',
            goals: [
                { goal_id: 'G6', dimension: '业绩', content: '完成用户中心微服务重构', measure: '用户中心服务拆分上线，核心接口响应时间降低 50%', goal_review: '用户中心已完成服务拆分并上线，核心接口响应时间降低 58%，超过预期目标。' },
                { goal_id: 'G7', dimension: '能力', content: '掌握 K8s 部署流程', measure: '独立完成 K8s 部署配置，通过运维团队评审', goal_review: '已独立完成 K8s 部署配置并通过评审，目前可自主完成服务部署。' }
            ],
            evaluations: [
                {
                    eval_id: 'EV001', evaluator_name: '吴芳芳', evaluator_role: '员工',
                    eval_type: 'self', content: '试用期内主要完成了用户中心微服务重构项目，将单体服务成功拆分为独立微服务，核心接口响应时间降低 58%，超出 50% 的预期目标。同时学习并掌握了 K8s 部署流程，已能独立完成服务部署配置。在团队协作方面积极参与 Code Review，主动承担技术分享任务。整体自我评价良好，基本达成试用期目标。',
                    create_time: '2025-08-20 14:00'
                }
            ],
            approval_logs: [],
            manager_eval_done: false, allow_employee_view_eval: false
        },
        // ---- 状态 07：待发起审批（上级已评价，HRBP 待发起审批）----
        {
            master_id: 'M012', emp_name: '孙浩然', emp_id: 'E1012',
            position: '后端开发工程师', dept_name: '服务端组', parent_dept: '研发部',
            manager_name: '陈思远', hrbp_name: '刘建国',
            hire_date: '2025-04-20', probation_status: '07',
            final_decision: '符合预期',
            goals: [
                { goal_id: 'G20', dimension: '业绩', content: '完成订单系统重构', measure: '订单系统重构上线，QPS 提升 50%', goal_review: '订单系统已重构上线，QPS 提升 60%，超出预期。' },
                { goal_id: 'G21', dimension: '能力', content: '掌握微服务架构设计', measure: '独立完成微服务拆分方案并通过评审', goal_review: '已独立完成微服务拆分方案并通过评审。' }
            ],
            evaluations: [
                {
                    eval_id: 'EV030', evaluator_name: '孙浩然', evaluator_role: '员工',
                    eval_type: 'self', content: '试用期完成了订单系统重构，QPS 提升 60%。学习了微服务架构，已能独立设计方案。整体表现良好。',
                    create_time: '2025-10-10 10:00'
                },
                {
                    eval_id: 'EV031', evaluator_name: '陈思远', evaluator_role: '主管',
                    eval_type: 'manager', content: '符合预期 - 该同学技术能力扎实，订单重构项目完成度高，建议转正。',
                    create_time: '2025-10-12 14:00'
                }
            ],
            approval_logs: [],
            manager_eval_done: true, allow_employee_view_eval: false
        },
        // ---- 状态 08：审批中（从 07 发起审批后）----
        {
            master_id: 'M010', emp_name: '黄伟强', emp_id: 'E1010',
            position: '前端开发工程师', dept_name: '移动开发组', parent_dept: '研发部',
            manager_name: '陈思远', hrbp_name: '刘建国',
            hire_date: '2025-04-01', probation_status: '08',
            final_decision: '符合预期',
            goals: [
                { goal_id: 'G13', dimension: '业绩', content: '完成移动端首页改版，页面加载速度提升 40%', measure: 'LCP 指标降至 1.5s 以内，通过性能测试验收', goal_review: '移动端首页改版已完成上线，LCP 降至 1.3s，超出预期目标。' },
                { goal_id: 'G14', dimension: '能力', content: '掌握 Flutter 跨平台开发框架', measure: '独立完成 2 个 Flutter 页面开发并通过代码评审', goal_review: '已独立完成 3 个 Flutter 页面开发，代码评审均通过，技术成长明显。' },
                { goal_id: 'G15', dimension: '融入', content: '参与团队技术分享，输出 1 篇技术博客', measure: '完成至少 1 次团队内技术分享，发布 1 篇技术博客', goal_review: '完成 2 次团队技术分享（Flutter 入门、性能优化实践），已发布 1 篇技术博客。' }
            ],
            evaluations: [
                {
                    eval_id: 'EV020', evaluator_name: '黄伟强', evaluator_role: '员工',
                    eval_type: 'self', content: '试用期完成了移动端首页改版，学习了 Flutter 框架，积极参与团队建设。整体表现良好，达到预期。',
                    create_time: '2025-09-15 10:00'
                },
                {
                    eval_id: 'EV021', evaluator_name: '陈思远', evaluator_role: '主管',
                    eval_type: 'manager', content: '符合预期 - 该同学技术能力扎实，首页改版项目完成度高，Flutter 学习速度快，团队融入良好。建议转正。',
                    create_time: '2025-09-18 14:00'
                }
            ],
            approval_logs: [],
            manager_eval_done: true, allow_employee_view_eval: false
        },
        // ---- 状态 09：待发布结果 ----
        {
            master_id: 'M009', emp_name: '陈志远', emp_id: 'E1009',
            position: '算法工程师', dept_name: '算法组', parent_dept: '研发部',
            manager_name: '陈思远', hrbp_name: '刘建国',
            hire_date: '2025-02-01', probation_status: '09',
            final_decision: '符合预期',
            goals: [
                { goal_id: 'G12', dimension: '业绩', content: '搜索推荐模型优化，CTR 提升 5%', measure: 'A/B 实验验证 CTR 提升幅度，输出优化报告', goal_review: '通过优化召回策略和排序模型，A/B 实验验证 CTR 提升 6.2%，超出 5% 的目标。已完成优化报告输出。' }
            ],
            evaluations: [
                {
                    eval_id: 'EV010', evaluator_name: '陈志远', evaluator_role: '员工',
                    eval_type: 'self', content: '优化了搜索推荐模型，CTR 提升 6.2%，超出目标。', create_time: '2025-07-20 10:00'
                },
                {
                    eval_id: 'EV011', evaluator_name: '陈思远', evaluator_role: '主管',
                    eval_type: 'manager', content: '该同学表现优秀，CTR 提升超出预期，积极融入团队。建议转正。', create_time: '2025-07-22 14:00'
                }
            ],
            approval_logs: [
                { log_id: 'L001', node_name: '二级部门负责人', approver_name: '赵总', action: '同意', comment: '同意转正', action_time: '2025-07-25 09:00' },
                { log_id: 'L002', node_name: 'HRG', approver_name: '钱总', action: '同意', comment: '', action_time: '2025-07-26 11:00' }
            ],
            manager_eval_done: true, allow_employee_view_eval: false
        },
        // ---- 状态 10：结果已发布 (转正通过) ----
        {
            master_id: 'M006', emp_name: '郑大伟', emp_id: 'E1006',
            position: '数据分析师', dept_name: '数据组', parent_dept: '产品部',
            manager_name: '陈思远', hrbp_name: '刘建国',
            hire_date: '2025-01-10', probation_status: '10',
            final_decision: '符合预期',
            goals: [
                { goal_id: 'G8', dimension: '业绩', content: '搭建日报数据看板', measure: '看板上线并覆盖核心业务指标，日活跃用户使用率≥60%', goal_review: '看板已上线并覆盖全部核心业务指标，日活跃用户使用率达到 72%，超出 60% 的目标线。' }
            ],
            evaluations: [
                {
                    eval_id: 'EV002', evaluator_name: '郑大伟', evaluator_role: '员工',
                    eval_type: 'self', content: '成功搭建了日报数据看板，日活跃用户增长 15%。', create_time: '2025-06-15 10:00'
                },
                {
                    eval_id: 'EV003', evaluator_name: '陈思远', evaluator_role: '主管',
                    eval_type: 'manager', content: '数据看板质量较高，工作认真负责，符合预期。', create_time: '2025-06-20 16:00'
                }
            ],
            approval_logs: [
                { log_id: 'L003', node_name: '二级部门负责人', approver_name: '赵总', action: '同意', action_time: '2025-06-25 09:00' }
            ],
            manager_eval_done: true, allow_employee_view_eval: true,
            result_published_time: '2025-06-28 10:00'
        },
        // ---- 状态 10：结果已发布 (转正未通过) ----
        {
            master_id: 'M007', emp_name: '林小红', emp_id: 'E1007',
            position: '运营专员', dept_name: '用户运营组', parent_dept: '运营部',
            manager_name: '陈思远', hrbp_name: '刘建国',
            hire_date: '2024-11-01', probation_status: '10',
            final_decision: '不符合录用条件',
            goals: [
                { goal_id: 'G9', dimension: '业绩', content: '拉新活动完成率≥80%', measure: '活动上线后实际拉新数据与目标对比，按月统计完成率', goal_review: '拉新活动实际完成率 55%，与 80% 目标差距较大。主要原因是渠道资源不足和活动策划经验欠缺。' }
            ],
            evaluations: [
                {
                    eval_id: 'EV004', evaluator_name: '林小红', evaluator_role: '员工',
                    eval_type: 'self', content: '拉新活动完成率 55%，需要改进。', create_time: '2025-04-20 10:00'
                },
                {
                    eval_id: 'EV005', evaluator_name: '陈思远', evaluator_role: '主管',
                    eval_type: 'manager', content: '活动完成率远低于预期，缺乏有效改进。',
                    reject_reason: '活动完成率 55% 远低于 80% 目标，多次辅导后无明显改善。', create_time: '2025-04-25 14:00'
                }
            ],
            approval_logs: [
                { log_id: 'L004', node_name: '二级部门负责人', approver_name: '赵总', action: '同意', comment: '同意不予转正', action_time: '2025-04-28 09:00' }
            ],
            manager_eval_done: true, allow_employee_view_eval: false,
            result_published_time: '2025-05-01 10:00'
        }
    ]);

    const currentUserRole = ref<'Employee' | 'Manager' | 'HRBP' | 'Approver'>('Employee');
    const currentEmpId = ref('E1001');

    // ====== Actions ======

    function saveGoals(masterId: string, goals: GoalItem[], submit: boolean) {
        const r = records.value.find(rec => rec.master_id === masterId);
        if (r) {
            r.goals = [...goals];
            if (submit) r.probation_status = '02';
        }
    }

    function confirmGoals(masterId: string) {
        const r = records.value.find(rec => rec.master_id === masterId);
        if (r) r.probation_status = '03';
    }

    function returnGoals(masterId: string, comment: string) {
        const r = records.value.find(rec => rec.master_id === masterId);
        if (r) { r.probation_status = '01'; r.return_comment = comment; }
    }

    /** HRBP 发起转正流程 -> 05 待员工自评 */
    function triggerProbation(masterId: string) {
        const r = records.value.find(rec => rec.master_id === masterId);
        if (r) r.probation_status = '05';
    }

    /** HRBP 挂起 -> 99 */
    function holdProbation(masterId: string) {
        const r = records.value.find(rec => rec.master_id === masterId);
        if (r) r.probation_status = '99';
    }

    /** HRBP 发起审批 -> 08 审批中 */
    function triggerApproval(masterId: string) {
        const r = records.value.find(rec => rec.master_id === masterId);
        if (r) r.probation_status = '08';
    }

    /** 员工提交自评 -> 06 待上级评价
     *  content: 逐目标自评内容（JSON 序列化） + 总体评价
     */
    function submitSelfEval(masterId: string, content: string, empName: string) {
        const r = records.value.find(rec => rec.master_id === masterId);
        if (r) {
            r.evaluations.push({
                eval_id: 'EV' + Date.now(),
                evaluator_name: empName,
                evaluator_role: '员工',
                eval_type: 'self',
                content,
                create_time: new Date().toLocaleString()
            });
            r.probation_status = '06';
            r.manager_eval_done = false;
        }
    }

    /** 上级提交评价 -> 07 待发起审批 */
    function submitManagerEval(masterId: string, content: string, decision: string) {
        const r = records.value.find(rec => rec.master_id === masterId);
        if (r) {
            r.evaluations.push({
                eval_id: 'EV' + Date.now(),
                evaluator_name: r.manager_name,
                evaluator_role: '主管',
                eval_type: 'manager',
                content: `${decision} - ${content}`,
                reject_reason: decision === '不符合录用条件' ? content : undefined,
                create_time: new Date().toLocaleString()
            });
            r.final_decision = decision as any;
            r.manager_eval_done = true;
            r.probation_status = '07';
        }
    }

    /** 审批通过 -> 09 待发布结果 */
    function approveRecord(masterId: string, approverName: string, nodeName: string, comment?: string) {
        const r = records.value.find(rec => rec.master_id === masterId);
        if (r) {
            r.approval_logs.push({
                log_id: 'L' + Date.now(),
                node_name: nodeName,
                approver_name: approverName,
                action: '同意',
                comment,
                action_time: new Date().toLocaleString()
            });
            r.probation_status = '09';
        }
    }

    /** 审批拒绝 -> 退回至06 */
    function rejectRecord(masterId: string, approverName: string, nodeName: string, comment: string) {
        const r = records.value.find(rec => rec.master_id === masterId);
        if (r) {
            r.approval_logs.push({
                log_id: 'L' + Date.now(),
                node_name: nodeName,
                approver_name: approverName,
                action: '拒绝',
                comment,
                action_time: new Date().toLocaleString()
            });
            r.probation_status = '06';
            r.manager_eval_done = false;
        }
    }

    /** HRBP 发布结果 -> 10 */
    function publishResult(masterId: string, allowViewEval: boolean) {
        const r = records.value.find(rec => rec.master_id === masterId);
        if (r) {
            r.probation_status = '10';
            r.allow_employee_view_eval = allowViewEval;
            r.result_published_time = new Date().toLocaleString();
        }
    }

    function setProbationStatus(masterId: string, status: string) {
        const r = records.value.find(rec => rec.master_id === masterId);
        if (r) r.probation_status = status;
    }

    function setCurrentEmpId(empId: string) {
        currentEmpId.value = empId;
    }

    return {
        records, currentUserRole, currentEmpId,
        saveGoals, confirmGoals, returnGoals,
        triggerProbation, holdProbation, triggerApproval,
        submitSelfEval, submitManagerEval,
        approveRecord, rejectRecord,
        publishResult, setProbationStatus, setCurrentEmpId
    };
});
