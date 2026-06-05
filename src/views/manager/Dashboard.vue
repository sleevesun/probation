<template>
  <div class="workbench-page">
    <a-page-header title="试用期管理" />

    <!-- Tabs -->
    <a-card class="workbench-card">
      <a-tabs v-model:activeKey="activeTab" class="workbench-tabs">
        <!-- 未转正 Tab -->
        <a-tab-pane key="unfinished" tab="未转正">
          <!-- 流程轴过滤 -->
          <div style="margin-bottom: 12px; padding: 6px 12px; background: #fafafa; border-radius: 8px;">
            <a-steps :current="currentStepIndex" @change="onStepChange" type="navigation" size="small" class="custom-steps">
              <a-step :title="`全部(${stepCounts.all})`" />
              <a-step :title="`目标设定(${stepCounts.goal_setting})`" />
              <a-step :title="`试用期评价(${stepCounts.probation_eval})`" />
              <a-step :title="`转正审批(${stepCounts.approval})`" />
            </a-steps>
          </div>

          <a-form layout="inline" style="margin-bottom: 16px; flex-wrap: wrap; gap: 8px">
            <a-form-item>
              <a-checkbox v-model:checked="onlyMyTodo">待我处理</a-checkbox>
            </a-form-item>
            <a-form-item label="搜索">
              <a-input v-model:value="searchText" placeholder="姓名 / 工号" allow-clear style="width: 180px" />
            </a-form-item>
            <a-form-item label="部门">
              <a-select v-model:value="filterDept" placeholder="全部部门" allow-clear style="width: 180px">
                <a-select-option v-for="d in deptOptions" :key="d" :value="d">{{ d }}</a-select-option>
              </a-select>
            </a-form-item>
            <a-form-item>
              <a-button @click="resetFilters">重置</a-button>
            </a-form-item>
          </a-form>

          <a-table :dataSource="sortedUnfinished" :columns="columns" rowKey="master_id" bordered size="middle">
            <template #bodyCell="{ column, record }">
              <template v-if="column.dataIndex === 'dept_display'">{{ record.parent_dept }}\{{ record.dept_name }}</template>
              <template v-if="column.dataIndex === 'tenure'"><span :style="parseFloat(getMonthsSinceHire(record.hire_date)) > 6 ? 'color: #ff4d4f; font-weight: 500' : ''">{{ getMonthsSinceHire(record.hire_date) }} 个月</span></template>
              <template v-if="column.dataIndex === 'probation_status'">
                <a-tag :color="STATUS_COLOR[record.probation_status]">
                  {{ getDetailedStatusText(record) }}
                </a-tag>
              </template>
              <template v-if="column.dataIndex === 'current_handler'">
                {{ getCurrentHandler(record) }}
              </template>
              <template v-if="column.key === 'action'">
                <a-space>
                  <a-button v-if="record.probation_status === '02'" type="primary" size="small" @click="openGoalModal(record)">目标确认</a-button>
                  <a-button v-if="record.probation_status === '06' && !record.manager_eval_done" type="primary" size="small" @click="openEvalModal(record)">试用期评价</a-button>
                  <a-button v-if="record.probation_status === '06' && record.manager_eval_done" type="text" size="small" @click="openEvalModal(record)">已完成评价</a-button>
                  <a-button v-if="['03'].includes(record.probation_status)" type="text" danger size="small" @click="forceReturn(record)">目标退回调整</a-button>
                  <a-button v-if="['02','03','04'].includes(record.probation_status)" size="small" @click="openStageEvalModal(record)">阶段性反馈</a-button>
                </a-space>
              </template>
              <template v-if="column.key === 'detail'">
                <a-button type="link" size="small" @click="openEvalModal(record)">查看详情</a-button>
              </template>
            </template>
          </a-table>
        </a-tab-pane>

        <!-- 已结束 Tab -->
        <a-tab-pane key="finished" tab="已结束">
          <a-table :dataSource="finishedList" :columns="finishedColumns" rowKey="master_id" bordered size="middle">
            <template #bodyCell="{ column, record }">
              <template v-if="column.dataIndex === 'dept_display'">{{ record.parent_dept }}\{{ record.dept_name }}</template>
              <template v-if="column.dataIndex === 'tenure'"><span :style="parseFloat(getMonthsSinceHire(record.hire_date)) > 6 ? 'color: #ff4d4f; font-weight: 500' : ''">{{ getMonthsSinceHire(record.hire_date) }} 个月</span></template>
              <template v-if="column.dataIndex === 'final_decision'">
                <a-tag :color="isFailedDecision(record.final_decision) || record.final_decision === '离职' ? 'error' : 'success'">{{ formatDecisionLabel(record.final_decision) }}</a-tag>
              </template>
              <template v-if="column.key === 'detail'">
                <a-button type="link" size="small" @click="openEvalModal(record)">查看详情</a-button>
              </template>
            </template>
          </a-table>
        </a-tab-pane>
      </a-tabs>
    </a-card>

    <!-- Goal Approval Modal -->
    <a-modal v-model:open="goalModalVisible" title="试用期目标确认" width="800px" :footer="null">
      <div v-if="currentReviewRecord">
        <a-descriptions bordered size="small" :column="2" style="margin-bottom: 16px">
          <a-descriptions-item label="员工姓名">{{ currentReviewRecord.emp_name }}</a-descriptions-item>
          <a-descriptions-item label="岗位">{{ currentReviewRecord.position }}</a-descriptions-item>
          <a-descriptions-item label="部门">{{ currentReviewRecord.parent_dept }}\{{ currentReviewRecord.dept_name }}</a-descriptions-item>
          <a-descriptions-item label="入职时间">{{ currentReviewRecord.hire_date }}</a-descriptions-item>
        </a-descriptions>

        <a-table :dataSource="currentReviewRecord.goals" :columns="goalConfirmColumns" :pagination="false" rowKey="goal_id" size="small" bordered />

        <div style="margin-top: 16px" v-if="showRejectInput">
          <a-form-item label="退回意见" required>
            <a-textarea v-model:value="rejectComment" :rows="3" placeholder="请输入退回修改的具体原因（必填）..." />
          </a-form-item>
        </div>

        <div style="margin-top: 24px; text-align: right">
          <a-space>
            <a-button v-if="!showRejectInput" danger @click="showRejectInput = true">退回修改</a-button>
            <template v-if="showRejectInput">
              <a-button @click="showRejectInput = false; rejectComment = ''">取消退回</a-button>
              <a-button danger @click="handleReject" :disabled="!rejectComment.trim()">确认退回</a-button>
            </template>
            <a-button type="primary" @click="handleConfirm" v-if="!showRejectInput">确认目标</a-button>
          </a-space>
        </div>
      </div>
    </a-modal>

    <!-- Force Return Modal -->
    <a-modal v-model:open="forceReturnModalVisible" title="退回调整" @ok="handleForceReturn" okText="确认退回" cancelText="取消" okType="danger" :okButtonProps="{ disabled: !forceReturnComment.trim() }">
      <p>确认要退回 <strong>{{ forceReturnRecord?.emp_name }}</strong> 的目标，要求其重新调整吗？</p>
      <p style="color: #999; font-size: 13px">退回后流程将打回至"待设定目标"步骤。</p>
      <a-form-item label="退回说明" required style="margin-top: 16px">
        <a-textarea v-model:value="forceReturnComment" :rows="4" placeholder="请输入退回说明，告知员工需要调整的原因（必填）..." />
      </a-form-item>
    </a-modal>

    <!-- Evaluation Modal -->
    <a-modal v-model:open="evalModalVisible" title="试用期评价" width="900px" :footer="null" :bodyStyle="{ maxHeight: '75vh', overflowY: 'auto' }">
      <div v-if="evalModalRecord">
        <!-- 员工信息 -->
        <a-descriptions bordered size="small" :column="3" style="margin-bottom: 16px">
          <a-descriptions-item label="员工姓名">{{ evalModalRecord.emp_name }}</a-descriptions-item>
          <a-descriptions-item label="工号">{{ evalModalRecord.emp_id }}</a-descriptions-item>
          <a-descriptions-item label="岗位">{{ evalModalRecord.position }}</a-descriptions-item>
          <a-descriptions-item label="部门">{{ evalModalRecord.parent_dept }}\{{ evalModalRecord.dept_name }}</a-descriptions-item>
          <a-descriptions-item label="入职日期">{{ evalModalRecord.hire_date }}</a-descriptions-item>
          <a-descriptions-item label="入职时长"><span :style="parseFloat(getMonthsSinceHire(evalModalRecord.hire_date)) > 6 ? 'color: #ff4d4f; font-weight: 500' : ''">{{ getMonthsSinceHire(evalModalRecord.hire_date) }} 个月</span></a-descriptions-item>
          <a-descriptions-item label="直属上级">{{ evalModalRecord.manager_name }}</a-descriptions-item>
          <a-descriptions-item label="HRBP">{{ evalModalRecord.hrbp_name }}</a-descriptions-item>
        </a-descriptions>

        <!-- 试用期目标 -->
        <div style="font-weight: 600; margin: 16px 0 8px; font-size: 14px">试用期目标</div>
        <div v-if="evalModalRecord.goals.length > 0" class="stacked-list">
          <div v-for="(goal, index) in evalModalRecord.goals" :key="goal.goal_id" class="stacked-item">
            <div class="stacked-goal-title">
              {{ index + 1 }}. {{ goal.content }}
            </div>
            <div class="stacked-row">
              <span class="stacked-label">预期结果</span>
              <span class="stacked-value">{{ goal.measure }}</span>
            </div>
            <div class="stacked-row">
              <span class="stacked-label">目标回顾</span>
              <span class="stacked-value">{{ goal.goal_review || '暂无目标回顾' }}</span>
            </div>
          </div>
        </div>
        <a-empty v-else description="暂无目标" :image-style="{ height: '40px' }" />

        <!-- 阶段性反馈 -->
        <div style="font-weight: 600; margin: 16px 0 8px; font-size: 14px">阶段性反馈</div>
        <div v-if="(evalModalRecord.stage_evaluations || []).length > 0" class="stacked-list" style="margin-bottom: 8px">
          <div v-for="item in evalModalRecord.stage_evaluations || []" :key="item.stage_eval_id" class="stacked-item">
            <div class="stacked-meta-line">{{ item.evaluator_name }}-{{ item.evaluator_role }} <span>{{ item.create_time }}</span></div>
            <div class="stacked-content">{{ item.content }}</div>
          </div>
        </div>
        <a-empty v-else description="暂无阶段性反馈记录" :image-style="{ height: '40px' }" />

        <!-- 员工自评 -->
        <div style="font-weight: 600; margin: 16px 0 8px; font-size: 14px">员工自评</div>
        <div v-if="evalSelfEval" class="eval-text-block">
          {{ evalSelfEval.content }}
        </div>
        <a-empty v-else description="员工暂未填写自评" :imageStyle="{ height: '40px' }" />

        <!-- 上级评价 -->
        <div style="font-weight: 600; margin: 20px 0 8px; font-size: 14px">上级评价</div>
        <div
          v-if="evalModalRecord.probation_status !== '06'"
          style="margin-bottom: 12px; color: #999; font-size: 12px"
        >
          当前状态「{{ getDetailedStatusText(evalModalRecord) }}」暂不可评价
        </div>

        <a-form layout="vertical">
          <a-form-item label="结论" required>
            <a-radio-group v-model:value="evalDecision" button-style="solid" :disabled="evalCannotEval">
              <a-radio-button value="超出预期">通过（超出预期）</a-radio-button>
              <a-radio-button value="符合预期">通过（符合预期）</a-radio-button>
              <a-radio-button value="不符合转正条件">不通过</a-radio-button>
            </a-radio-group>
          </a-form-item>

          <a-form-item label="评价意见" required>
            <a-textarea
              v-model:value="evalReason"
              :rows="4"
              placeholder="请填写评价意见。"
              :disabled="evalCannotEval"
            />
          </a-form-item>

          <div style="margin-top: 16px; text-align: right">
            <a-space>
              <a-button @click="evalModalVisible = false">返回</a-button>
              <a-button
                type="primary"
                :disabled="evalCannotEval"
                @click="handleEvalSubmit"
                :loading="evalSaving"
              >
                提交评价
              </a-button>
            </a-space>
            <div style="text-align: center; margin-top: 8px; color: #999; font-size: 12px" v-if="!evalCannotEval">
              提交后将由 HRBP 发起转正审批流程
            </div>
          </div>
        </a-form>

        <!-- 审批记录 -->
        <div v-if="['08', '09', '10'].includes(evalModalRecord.probation_status)" class="approval-records-section">
          <div class="approval-records-title">审批记录</div>
          <div v-if="evalModalRecord.approval_logs && evalModalRecord.approval_logs.length > 0">
            <div v-for="log in evalModalRecord.approval_logs" :key="log.log_id" class="approval-record-item">
              <div class="approval-record-item__header">
                <span class="approval-record-item__node">{{ log.node_name }}</span>
                <span class="approval-record-item__action" :class="{ 'approval-record-item__action--agree': log.action === '同意', 'approval-record-item__action--reject': log.action === '拒绝' }">{{ log.action }}</span>
              </div>
              <div class="approval-record-item__info">
                <span>{{ log.approver_name }}</span>
                <span class="approval-record-item__time">{{ log.action_time }}</span>
              </div>
              <div v-if="log.comment && log.comment !== '-'" class="approval-record-item__comment">{{ log.comment }}</div>
            </div>
          </div>
          <div v-else class="approval-record-empty">暂无审批记录</div>
        </div>
      </div>
    </a-modal>

    <!-- 阶段性反馈弹窗 -->
    <a-modal v-model:open="stageEvalModalVisible" title="填写阶段性反馈" width="700px" :footer="null">
      <div v-if="stageEvalRecord">
        <a-descriptions bordered size="small" :column="2" style="margin-bottom: 16px">
          <a-descriptions-item label="员工">{{ stageEvalRecord.emp_name }} ({{ stageEvalRecord.emp_id }})</a-descriptions-item>
          <a-descriptions-item label="岗位">{{ stageEvalRecord.position }}</a-descriptions-item>
          <a-descriptions-item label="部门">{{ stageEvalRecord.parent_dept }}\{{ stageEvalRecord.dept_name }}</a-descriptions-item>
          <a-descriptions-item label="直属上级">{{ stageEvalRecord.manager_name }}</a-descriptions-item>
          <a-descriptions-item label="入职日期">{{ stageEvalRecord.hire_date }}</a-descriptions-item>
          <a-descriptions-item label="当前状态">{{ getDetailedStatusText(stageEvalRecord) }}</a-descriptions-item>
        </a-descriptions>

        <div style="font-weight: 600; margin-bottom: 8px">目标信息</div>
        <a-table v-if="stageEvalRecord.goals.length > 0" :dataSource="stageEvalRecord.goals" :columns="stageGoalColumns" :pagination="false" rowKey="goal_id" size="small" bordered style="margin-bottom: 16px" />
        <a-alert v-else type="info" message="暂未完成试用期目标制定" style="margin-bottom: 16px" />

        <div style="font-weight: 600; margin-bottom: 8px">历史阶段性反馈</div>
        <a-table v-if="(stageEvalRecord.stage_evaluations || []).length > 0" :dataSource="stageEvalRecord.stage_evaluations || []" :columns="stageEvalHistoryColumns" :pagination="false" rowKey="stage_eval_id" size="small" bordered style="margin-bottom: 16px" />
        <a-empty v-else description="暂无阶段性反馈记录" :image-style="{ height: '40px' }" style="margin-bottom: 16px" />

        <a-form layout="vertical">
          <a-form-item label="评价内容" required>
            <a-textarea v-model:value="stageEvalContent" :rows="4" placeholder="请输入阶段性反馈内容" />
          </a-form-item>
          <div style="text-align: right">
            <a-space>
              <a-button @click="stageEvalModalVisible = false">取消</a-button>
              <a-button type="primary" @click="handleStageEvalSubmit" :disabled="!stageEvalContent.trim()">提交评价</a-button>
            </a-space>
          </div>
        </a-form>
      </div>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useProbationStore, ProbationMaster, STATUS_COLOR, getDetailedStatusText, getMonthsSinceHire, getCurrentHandler, formatDecisionLabel, isFailedDecision } from '@/store/probation';
import { message } from 'ant-design-vue';
const store = useProbationStore();

const activeTab = ref('unfinished');
const searchText = ref('');
const filterDept = ref<string | undefined>(undefined);
const activeTodoFilter = ref<string>('');

const currentStepIndex = ref<number>(0);
const activeStepFilter = ref<string>('all');

// 未转正：排除已结束状态(10/88/99)
const unfinishedRecords = computed(() => store.records.filter(r => !['10', '88', '99'].includes(r.probation_status)));
// 已结束：结果已发布(10) + 未转正离职(88) + 暂不发起/终止(99)
const finishedList = computed(() => store.records.filter(r => ['10', '88', '99'].includes(r.probation_status)));
const onlyMyTodo = ref(false);

const formatCount = (count: number) => count > 0 ? count : '-';

const stepCounts = computed(() => {
  // 只统计当前上级下属的数据
  // 这里简化处理，因为 mock 数据中 manager_name 都是 '陈思远'
  const records = unfinishedRecords.value;
  return {
    all: formatCount(records.length),
    goal_setting: formatCount(records.filter(r => ['01', '02', '03', '04'].includes(r.probation_status)).length),
    probation_eval: formatCount(records.filter(r => ['05', '06', '07'].includes(r.probation_status)).length),
    approval: formatCount(records.filter(r => ['08', '09'].includes(r.probation_status)).length)
  };
});

const onStepChange = (current: number) => {
  currentStepIndex.value = current;
  const stepMap = ['all', 'goal_setting', 'probation_eval', 'approval'];
  const filterVal = stepMap[current];

  activeTab.value = 'unfinished';
  activeStepFilter.value = filterVal;
  activeTodoFilter.value = '';
};

const deptOptions = computed(() => {
  const depts = new Set(store.records.map(r => `${r.parent_dept}\\${r.dept_name}`));
  return Array.from(depts);
});

const resetFilters = () => {
  searchText.value = '';
  filterDept.value = undefined;
  activeTodoFilter.value = '';
  activeStepFilter.value = 'all';
  currentStepIndex.value = 0;
  onlyMyTodo.value = false;
};

const filteredUnfinished = computed(() => {
  let list = unfinishedRecords.value;

  // 待我处理筛选
  if (onlyMyTodo.value) {
    list = list.filter(r =>
      (r.probation_status === '02') ||
      (r.probation_status === '06' && !r.manager_eval_done) ||
      (r.probation_status === '03')
    );
  }

  // 1. 流程概览过滤
  if (activeStepFilter.value !== 'all') {
    if (activeStepFilter.value === 'goal_setting') {
      list = list.filter(r => ['01', '02', '03', '04'].includes(r.probation_status));
    } else if (activeStepFilter.value === 'probation_eval') {
      list = list.filter(r => ['05', '06', '07'].includes(r.probation_status));
    } else if (activeStepFilter.value === 'approval') {
      list = list.filter(r => ['08', '09'].includes(r.probation_status));
    }
  }

  if (activeTodoFilter.value) {
    if (activeTodoFilter.value === '02') list = list.filter(r => r.probation_status === '02');
    if (activeTodoFilter.value === '06') list = list.filter(r => r.probation_status === '06' && !r.manager_eval_done);
  }

  // 2. 表单过滤
  if (searchText.value) {
    const kw = searchText.value.toLowerCase();
    list = list.filter(r => r.emp_name.toLowerCase().includes(kw) || r.emp_id.toLowerCase().includes(kw));
  }
  if (filterDept.value) list = list.filter(r => `${r.parent_dept}\\${r.dept_name}` === filterDept.value);
  return list;
});

// 排序: 上级待办(02:待确认, 06:待上级评价) -> 04(待发起) -> 入职日期asc
const sortedUnfinished = computed(() => {
  return [...filteredUnfinished.value].sort((a, b) => {
    const pa = getManagerPriority(a); const pb = getManagerPriority(b);
    if (pa !== pb) return pa - pb;
    return new Date(a.hire_date).getTime() - new Date(b.hire_date).getTime();
  });
});

function getManagerPriority(r: ProbationMaster): number {
  if (r.probation_status === '02') return 0;
  if (r.probation_status === '06' && !r.manager_eval_done) return 0;
  if (r.probation_status === '04') return 1;
  return 2;
}

const columns = [
  { title: '姓名', dataIndex: 'emp_name', width: 90 },
  { title: '工号', dataIndex: 'emp_id', width: 80 },
  { title: '岗位', dataIndex: 'position', width: 130 },
  { title: '直属部门', dataIndex: 'dept_display', width: 160 },
  { title: '入职日期', dataIndex: 'hire_date', width: 110 },
  { title: '入职时长', dataIndex: 'tenure', width: 100 },
  { title: '当前处理人', dataIndex: 'current_handler', width: 120 },
  { title: '当前状态', dataIndex: 'probation_status', width: 150 },
  { title: '操作', key: 'action', width: 200 },
  { title: '详情', key: 'detail', width: 80 }
];

const finishedColumns = [
  { title: '姓名', dataIndex: 'emp_name', width: 90 },
  { title: '工号', dataIndex: 'emp_id', width: 80 },
  { title: '岗位', dataIndex: 'position', width: 130 },
  { title: '直属部门', dataIndex: 'dept_display', width: 160 },
  { title: '入职日期', dataIndex: 'hire_date', width: 110 },
  { title: '入职时长', dataIndex: 'tenure', width: 100 },
  { title: '评价结果', dataIndex: 'final_decision', width: 160 },
  { title: '详情', key: 'detail', width: 80 }
];

const goalConfirmColumns = [
  { title: '序号', dataIndex: 'seq', width: 60, customRender: ({ index }: any) => index + 1 },
  { title: '目标内容', dataIndex: 'content' },
  { title: '预期结果', dataIndex: 'measure' }
];

const goalModalVisible = ref(false);
const currentReviewRecord = ref<ProbationMaster | null>(null);
const showRejectInput = ref(false);
const rejectComment = ref('');

const forceReturnModalVisible = ref(false);
const forceReturnRecord = ref<ProbationMaster | null>(null);
const forceReturnComment = ref('');

const openGoalModal = (record: ProbationMaster) => {
  currentReviewRecord.value = record; showRejectInput.value = false; rejectComment.value = ''; goalModalVisible.value = true;
};

const handleConfirm = () => {
  if (currentReviewRecord.value) { store.confirmGoals(currentReviewRecord.value.master_id); message.success('已确认目标'); goalModalVisible.value = false; }
};

const handleReject = () => {
  if (currentReviewRecord.value && rejectComment.value.trim()) {
    store.returnGoals(currentReviewRecord.value.master_id, rejectComment.value);
    message.warning('已退回修改，退回意见已通知员工'); goalModalVisible.value = false;
  }
};

const forceReturn = (record: ProbationMaster) => {
  forceReturnRecord.value = record;
  forceReturnComment.value = '';
  forceReturnModalVisible.value = true;
};

const handleForceReturn = () => {
  if (!forceReturnRecord.value || !forceReturnComment.value.trim()) return;
  store.returnGoals(forceReturnRecord.value.master_id, forceReturnComment.value);
  message.success('已退回调整，退回说明已通知员工');
  forceReturnModalVisible.value = false;
  forceReturnRecord.value = null;
  forceReturnComment.value = '';
};

// 评价弹窗
const evalModalVisible = ref(false);
const evalModalRecord = ref<ProbationMaster | null>(null);
const evalDecision = ref<'超出预期' | '符合预期' | '不符合转正条件'>('符合预期');
const evalReason = ref('');
const evalSaving = ref(false);

const evalCannotEval = computed(() => {
  if (!evalModalRecord.value) return true;
  return evalModalRecord.value.probation_status !== '06' || evalModalRecord.value.manager_eval_done;
});

const evalSelfEval = computed(() => {
  if (!evalModalRecord.value) return null;
  return (evalModalRecord.value.evaluations || []).find((e: any) => e.eval_type === 'self') || null;
});

const openEvalModal = (record: ProbationMaster) => {
  evalModalRecord.value = record;
  evalDecision.value = '符合预期';
  evalReason.value = '';
  evalModalVisible.value = true;
};

const handleEvalSubmit = () => {
  if (!evalReason.value.trim()) {
    message.error('请填写评价意见');
    return;
  }
  evalSaving.value = true;
  setTimeout(() => {
    store.submitManagerEval(evalModalRecord.value!.master_id, evalReason.value, evalDecision.value);
    message.success(isFailedDecision(evalDecision.value) ? '评价已提交，该员工已进入终止转正状态。' : '评价提交成功！等待 HRBP 发起转正审批流程。');
    evalSaving.value = false;
    evalModalVisible.value = false;
  }, 800);
};

// 阶段性反馈弹窗
const stageEvalModalVisible = ref(false);
const stageEvalRecord = ref<ProbationMaster | null>(null);
const stageEvalContent = ref('');

const stageGoalColumns = [
  { title: '序号', dataIndex: 'seq', width: 60, customRender: ({ index }: any) => index + 1 },
  { title: '目标内容', dataIndex: 'content' },
  { title: '预期结果', dataIndex: 'measure', width: 200 }
];

const stageEvalHistoryColumns = [
  { title: '填写人', dataIndex: 'evaluator_name', width: 80 },
  { title: '角色', dataIndex: 'evaluator_role', width: 80 },
  { title: '评价内容', dataIndex: 'content' },
  { title: '时间', dataIndex: 'create_time', width: 150 }
];

const openStageEvalModal = (record: ProbationMaster) => {
  stageEvalRecord.value = record;
  stageEvalContent.value = '';
  stageEvalModalVisible.value = true;
};

const handleStageEvalSubmit = () => {
  if (!stageEvalRecord.value || !stageEvalContent.value.trim()) return;
  store.addStageEvaluation(stageEvalRecord.value.master_id, '陈思远', '直属上级', stageEvalContent.value);
  message.success('阶段性反馈已提交');
  stageEvalModalVisible.value = false;
  stageEvalContent.value = '';
};
</script>

<style scoped>
/* [UI/UX 修复] todo-summary / todo-tag 公共样式已移至 style.css，此处仅保留组件特有样式 */

/* 自定义步骤条样式，使其更适合作为过滤栏 */
.custom-steps {
  cursor: pointer;
}
.custom-steps :deep(.ant-steps-item) {
  cursor: pointer;
  transition: opacity 0.3s;
  padding: 0 4px;
}
.custom-steps :deep(.ant-steps-item:hover) {
  opacity: 0.8;
}
.custom-steps :deep(.ant-steps-item-title) {
  font-size: 12px;
  line-height: 22px;
  padding: 0;
}
.custom-steps :deep(.ant-steps-item-description) {
  font-weight: bold;
  color: #1890ff;
}
/* 隐藏默认序号圆圈 */
.custom-steps :deep(.ant-steps-item-icon) {
  display: none;
}
.custom-steps :deep(.ant-steps-item-tail) {
  padding: 0;
  top: 11px;
}

.stacked-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.stacked-item {
  padding: 10px 12px;
  border: 1px solid #edf0f5;
  border-radius: 8px;
  background: #fbfcfe;
}

.stacked-row {
  display: grid;
  grid-template-columns: 72px 1fr;
  gap: 8px 12px;
  padding: 6px 0;
  border-top: 1px dashed #e7eaf0;
}

.stacked-row:first-child {
  border-top: none;
  padding-top: 0;
}

.stacked-row:last-child {
  padding-bottom: 0;
}

.stacked-label {
  color: #6b7280;
  font-weight: 600;
  white-space: nowrap;
}

.stacked-value {
  color: #1f2937;
  line-height: 1.7;
  word-break: break-word;
}

.stacked-value--index {
  font-weight: 700;
  color: #1677ff;
}

.stacked-goal-title {
  padding-bottom: 6px;
  color: #1f2937;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.7;
}

.stacked-meta-line {
  display: flex;
  gap: 24px;
  padding-bottom: 6px;
  color: #1f2937;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.7;
}

.stacked-meta-line > span {
  color: #667085;
  font-weight: 500;
}

.stacked-content,
.eval-text-block {
  padding-top: 6px;
  border-top: 1px dashed #e7eaf0;
  color: #1f2937;
  font-size: 13px;
  line-height: 1.7;
  white-space: pre-wrap;
  word-break: break-word;
}

.eval-text-block {
  padding: 10px 12px;
  border: 1px solid #edf0f5;
  border-radius: 8px;
  background: #fbfcfe;
}

/* 审批记录 */
.approval-records-section {
  margin-top: 16px;
}
.approval-records-title {
  font-weight: 600;
  margin-bottom: 12px;
  font-size: 14px;
}
.approval-record-item {
  padding: 12px;
  background: #f8fafc;
  border-radius: 8px;
  margin-bottom: 8px;
}
.approval-record-item__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}
.approval-record-item__node {
  font-weight: 500;
  color: #1f2329;
}
.approval-record-item__action {
  font-weight: 500;
}
.approval-record-item__action--agree {
  color: #52c41a;
}
.approval-record-item__action--reject {
  color: #ff4d4f;
}
.approval-record-item__info {
  font-size: 13px;
  color: #646a73;
  display: flex;
  gap: 12px;
}
.approval-record-item__time {
  color: #8f959e;
}
.approval-record-item__comment {
  margin-top: 8px;
  font-size: 13px;
  color: #333;
  padding: 8px 12px;
  background: #fff;
  border-radius: 6px;
  border: 1px solid #f0f1f3;
}
.approval-record-empty {
  color: #8f959e;
  font-size: 13px;
  text-align: center;
  padding: 16px;
}

/* 响应式步骤条 */
@media (max-width: 768px) {
  .custom-steps {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }
  .custom-steps :deep(.ant-steps-item-title) {
    font-size: 11px;
  }
}
</style>
