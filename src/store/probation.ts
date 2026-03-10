import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface GoalItem {
    goal_id: string;
    dimension: '业绩' | '能力' | '融入';
    content: string;
    weight: number;
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
     * 04 - 待发起转正流程
     * 05 - 待员工自评
     * 06 - 评价阶段 (上级 + HRBP 并行评价)
     * 08 - 转正流程审批
     * 09 - 待发布结果
     * 10 - 结果已发布
     * 99 - 已挂起
     */
    probation_status: string;
    final_decision?: '超出预期' | '符合预期' | '不符合录用条件';
    goals: GoalItem[];
    evaluations: EvaluationItem[];
    approval_logs: ApprovalLogItem[];
    return_comment?: string;
    // 并行评价标志
    manager_eval_done: boolean;
    hrbp_eval_done: boolean;
    // 发布结果相关
    allow_employee_view_eval: boolean; // HRBP 是否允许员工查看评价
    result_published_time?: string;    // 发布时间
}

// ====== 状态常量 ======
export const STATUS_MAP: Record<string, string> = {
    '01': '待设定目标',
    '02': '目标待确认',
    '03': '目标已确认',
    '04': '待发起转正流程',
    '05': '待员工自评',
    '06': '评价阶段',
    '08': '转正流程审批',
    '09': '待发布结果',
    '10': '结果已发布',
    '99': '已挂起'
};

export const STATUS_COLOR: Record<string, string> = {
    '01': 'default',
    '02': 'processing',
    '03': 'blue',
    '04': 'orange',
    '05': 'purple',
    '06': 'volcano',
    '08': 'orange',
    '09': 'gold',
    '10': 'success',
    '99': 'default'
};

/**
 * 获取状态的详细展示文本（区分评价阶段中的子状态）
 */
export function getDetailedStatusText(record: ProbationMaster): string {
    if (record.probation_status === '06') {
        const parts: string[] = [];
        if (!record.manager_eval_done) parts.push('待上级评价');
        if (!record.hrbp_eval_done) parts.push('待HRBP评价');
        if (parts.length === 0) return '评价已完成';
        return parts.join(' / ');
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

// ====== Store ======
export const useProbationStore = defineStore('probation', () => {

    const records = ref<ProbationMaster[]>([
        // ---- 状态 01：待设定目标 ----
        {
            master_id: 'M001', emp_name: '张三', emp_id: 'E1001',
            position: '前端开发工程师', dept_name: '前端组', parent_dept: '研发部',
            manager_name: '李四', hrbp_name: '王五',
            hire_date: '2025-10-15', probation_status: '01',
            goals: [], evaluations: [], approval_logs: [],
            manager_eval_done: false, hrbp_eval_done: false, allow_employee_view_eval: false
        },
        // ---- 状态 02：目标待确认 ----
        {
            master_id: 'M002', emp_name: '赵六', emp_id: 'E1002',
            position: '产品经理', dept_name: '产品策划组', parent_dept: '产品部',
            manager_name: '李四', hrbp_name: '王五',
            hire_date: '2025-09-01', probation_status: '02',
            goals: [
                { goal_id: 'G1', dimension: '业绩', content: '完成首页重构项目，提升页面加载速度30%', weight: 60 },
                { goal_id: 'G2', dimension: '融入', content: '熟悉内部系统与协同流程，参与部门周会分享', weight: 40 }
            ],
            evaluations: [], approval_logs: [],
            manager_eval_done: false, hrbp_eval_done: false, allow_employee_view_eval: false
        },
        // ---- 状态 03：目标已确认 ----
        {
            master_id: 'M008', emp_name: '王十二', emp_id: 'E1008',
            position: 'Java开发工程师', dept_name: '服务端组', parent_dept: '研发部',
            manager_name: '李四', hrbp_name: '王五',
            hire_date: '2025-08-20', probation_status: '03',
            goals: [
                { goal_id: 'G10', dimension: '业绩', content: '完成订单模块开发', weight: 60 },
                { goal_id: 'G11', dimension: '融入', content: '参与 Code Review 机制建设', weight: 40 }
            ],
            evaluations: [], approval_logs: [],
            manager_eval_done: false, hrbp_eval_done: false, allow_employee_view_eval: false
        },
        // ---- 状态 04：待发起转正流程 ----
        {
            master_id: 'M003', emp_name: '钱七', emp_id: 'E1003',
            position: 'UI设计师', dept_name: '视觉设计组', parent_dept: '设计部',
            manager_name: '李四', hrbp_name: '王五',
            hire_date: '2025-05-01', probation_status: '04',
            goals: [
                { goal_id: 'G3', dimension: '业绩', content: '产出5套大促视觉稿，通过率≥90%', weight: 80 },
                { goal_id: 'G4', dimension: '能力', content: '提升动效设计能力，完成2个动效项目', weight: 20 }
            ],
            evaluations: [], approval_logs: [],
            manager_eval_done: false, hrbp_eval_done: false, allow_employee_view_eval: false
        },
        // ---- 状态 05：待员工自评 ----
        {
            master_id: 'M004', emp_name: '孙八', emp_id: 'E1004',
            position: '测试工程师', dept_name: '质量保障组', parent_dept: '测试部',
            manager_name: '李四', hrbp_name: '王五',
            hire_date: '2025-04-15', probation_status: '05',
            goals: [
                { goal_id: 'G5', dimension: '业绩', content: '测试通过率达到 99%，覆盖率达到 85%', weight: 100 }
            ],
            evaluations: [], approval_logs: [],
            manager_eval_done: false, hrbp_eval_done: false, allow_employee_view_eval: false
        },
        // ---- 状态 06：评价阶段（上级未评、HRBP未评）----
        {
            master_id: 'M005', emp_name: '周九', emp_id: 'E1005',
            position: '后端开发工程师', dept_name: '服务端组', parent_dept: '研发部',
            manager_name: '李四', hrbp_name: '王五',
            hire_date: '2025-03-01', probation_status: '06',
            goals: [
                { goal_id: 'G6', dimension: '业绩', content: '完成用户中心微服务重构', weight: 70 },
                { goal_id: 'G7', dimension: '能力', content: '掌握 K8s 部署流程', weight: 30 }
            ],
            evaluations: [
                {
                    eval_id: 'EV001', evaluator_name: '周九', evaluator_role: '员工',
                    eval_type: 'self', content: '试用期完成了用户中心重构核心模块，学习了 K8s 基础部署。自我评价良好。',
                    create_time: '2025-08-20 14:00'
                }
            ],
            approval_logs: [],
            manager_eval_done: false, hrbp_eval_done: false, allow_employee_view_eval: false
        },
        // ---- 状态 09：待发布结果 ----
        {
            master_id: 'M009', emp_name: '陈十三', emp_id: 'E1009',
            position: '算法工程师', dept_name: '算法组', parent_dept: '研发部',
            manager_name: '李四', hrbp_name: '王五',
            hire_date: '2025-02-01', probation_status: '09',
            final_decision: '符合预期',
            goals: [
                { goal_id: 'G12', dimension: '业绩', content: '搜索推荐模型优化，CTR 提升 5%', weight: 100 }
            ],
            evaluations: [
                {
                    eval_id: 'EV010', evaluator_name: '陈十三', evaluator_role: '员工',
                    eval_type: 'self', content: '优化了搜索推荐模型，CTR 提升 6.2%，超出目标。', create_time: '2025-07-20 10:00'
                },
                {
                    eval_id: 'EV011', evaluator_name: '李四', evaluator_role: '主管',
                    eval_type: 'manager', content: '该同学表现优秀，CTR 提升超出预期，积极融入团队。建议转正。', create_time: '2025-07-22 14:00'
                },
                {
                    eval_id: 'EV012', evaluator_name: '王五', evaluator_role: 'HRBP',
                    eval_type: 'hrbp', content: '试用期表现稳定，团队协作良好，建议转正。', create_time: '2025-07-23 10:00'
                }
            ],
            approval_logs: [
                { log_id: 'L001', node_name: '二级部门负责人', approver_name: '赵总', action: '同意', comment: '同意转正', action_time: '2025-07-25 09:00' },
                { log_id: 'L002', node_name: 'HRG', approver_name: '钱总', action: '同意', comment: '', action_time: '2025-07-26 11:00' }
            ],
            manager_eval_done: true, hrbp_eval_done: true, allow_employee_view_eval: false
        },
        // ---- 状态 10：结果已发布 (转正通过) ----
        {
            master_id: 'M006', emp_name: '吴十', emp_id: 'E1006',
            position: '数据分析师', dept_name: '数据组', parent_dept: '产品部',
            manager_name: '李四', hrbp_name: '王五',
            hire_date: '2025-01-10', probation_status: '10',
            final_decision: '符合预期',
            goals: [
                { goal_id: 'G8', dimension: '业绩', content: '搭建日报数据看板', weight: 100 }
            ],
            evaluations: [
                {
                    eval_id: 'EV002', evaluator_name: '吴十', evaluator_role: '员工',
                    eval_type: 'self', content: '成功搭建了日报数据看板，日活跃用户增长 15%。', create_time: '2025-06-15 10:00'
                },
                {
                    eval_id: 'EV003', evaluator_name: '李四', evaluator_role: '主管',
                    eval_type: 'manager', content: '数据看板质量较高，工作认真负责，符合预期。', create_time: '2025-06-20 16:00'
                },
                {
                    eval_id: 'EV013', evaluator_name: '王五', evaluator_role: 'HRBP',
                    eval_type: 'hrbp', content: '表现稳定，融入良好。', create_time: '2025-06-21 10:00'
                }
            ],
            approval_logs: [
                { log_id: 'L003', node_name: '二级部门负责人', approver_name: '赵总', action: '同意', action_time: '2025-06-25 09:00' }
            ],
            manager_eval_done: true, hrbp_eval_done: true, allow_employee_view_eval: true,
            result_published_time: '2025-06-28 10:00'
        },
        // ---- 状态 10：结果已发布 (转正未通过) ----
        {
            master_id: 'M007', emp_name: '郑十一', emp_id: 'E1007',
            position: '运营专员', dept_name: '用户运营组', parent_dept: '运营部',
            manager_name: '李四', hrbp_name: '王五',
            hire_date: '2024-11-01', probation_status: '10',
            final_decision: '不符合录用条件',
            goals: [
                { goal_id: 'G9', dimension: '业绩', content: '拉新活动完成率≥80%', weight: 100 }
            ],
            evaluations: [
                {
                    eval_id: 'EV004', evaluator_name: '郑十一', evaluator_role: '员工',
                    eval_type: 'self', content: '拉新活动完成率 55%，需要改进。', create_time: '2025-04-20 10:00'
                },
                {
                    eval_id: 'EV005', evaluator_name: '李四', evaluator_role: '主管',
                    eval_type: 'manager', content: '活动完成率远低于预期，缺乏有效改进。',
                    reject_reason: '活动完成率 55% 远低于 80% 目标，多次辅导后无明显改善。', create_time: '2025-04-25 14:00'
                },
                {
                    eval_id: 'EV014', evaluator_name: '王五', evaluator_role: 'HRBP',
                    eval_type: 'hrbp', content: '试用期表现未达到录用标准。', create_time: '2025-04-26 10:00'
                }
            ],
            approval_logs: [
                { log_id: 'L004', node_name: '二级部门负责人', approver_name: '赵总', action: '同意', comment: '同意不予转正', action_time: '2025-04-28 09:00' }
            ],
            manager_eval_done: true, hrbp_eval_done: true, allow_employee_view_eval: false,
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

    /** 员工提交自评 -> 06 同时开启上级评价 + HRBP评价 */
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
            r.hrbp_eval_done = false;
        }
    }

    /** 上级提交评价 */
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
            // 如果 HRBP 也已完成 -> 进入审批
            if (r.hrbp_eval_done) r.probation_status = '08';
        }
    }

    /** HRBP 提交评价 */
    function submitHRBPEval(masterId: string, content: string) {
        const r = records.value.find(rec => rec.master_id === masterId);
        if (r) {
            r.evaluations.push({
                eval_id: 'EV' + Date.now(),
                evaluator_name: r.hrbp_name,
                evaluator_role: 'HRBP',
                eval_type: 'hrbp',
                content,
                create_time: new Date().toLocaleString()
            });
            r.hrbp_eval_done = true;
            // 如果主管也已完成 -> 进入审批
            if (r.manager_eval_done) r.probation_status = '08';
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
            r.hrbp_eval_done = false;
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

    return {
        records, currentUserRole, currentEmpId,
        saveGoals, confirmGoals, returnGoals,
        triggerProbation, holdProbation,
        submitSelfEval, submitManagerEval, submitHRBPEval,
        approveRecord, rejectRecord,
        publishResult, setProbationStatus
    };
});
