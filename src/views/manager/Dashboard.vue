<template>
  <div class="workbench-page">
    <a-page-header title="试用期管理" />

    <!-- Tabs -->
    <PrdAnnotation id="9">
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
              <a-tree-select
                v-model:value="filterDept"
                :tree-data="deptTreeData"
                tree-checkable
                multiple
                :show-checked-strategy="TreeSelect.SHOW_CHILD"
                placeholder="全部部门"
                allow-clear
                style="width: 260px"
              />
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
                <a-tag :color="getStatusColor(record)">
                  {{ getDetailedStatusText(record) }}
                </a-tag>
              </template>
              <template v-if="column.dataIndex === 'current_handler'">
                {{ getCurrentHandler(record) }}
              </template>
              <template v-if="column.key === 'action'">
                <a-space>
                  <template v-if="!record.terminated">
                    <a-button v-if="record.probation_status === '02'" type="primary" size="small" @click="openGoalModal(record)">目标确认</a-button>
                    <a-button v-if="record.probation_status === '06' && !record.manager_eval_done" type="primary" size="small" @click="openReviewModal(record)">试用期评价</a-button>
                    <a-button v-if="record.probation_status === '06' && record.manager_eval_done" type="text" size="small" @click="openEvalModal(record)">已完成评价</a-button>
                    <a-button v-if="['03'].includes(record.probation_status)" type="text" danger size="small" @click="forceReturn(record)">目标退回调整</a-button>
                    <a-button v-if="['02','03','04'].includes(record.probation_status)" size="small" @click="openStageEvalModal(record)">阶段性反馈</a-button>
                  </template>
                  <span v-else style="color: #999; font-size: 12px">已终止</span>
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
    </PrdAnnotation>

    <!-- Goal Approval Modal -->
    <a-modal v-model:open="goalModalVisible" title="试用期目标确认" width="960px" :footer="null">
      <PrdAnnotation v-if="currentReviewRecord" id="10">
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
      </PrdAnnotation>
    </a-modal>

    <!-- Force Return Modal -->
    <a-modal v-model:open="forceReturnModalVisible" title="退回调整" width="640px" @ok="handleForceReturn" okText="确认退回" cancelText="取消" okType="danger" :okButtonProps="{ disabled: !forceReturnComment.trim() }">
      <p>确认要退回 <strong>{{ forceReturnRecord?.emp_name }}</strong> 的目标，要求其重新调整吗？</p>
      <p style="color: #999; font-size: 13px">退回后流程将打回至"待设定目标"步骤。</p>
      <a-form-item label="退回说明" required style="margin-top: 16px">
        <a-textarea v-model:value="forceReturnComment" :rows="4" placeholder="请输入退回说明，告知员工需要调整的原因（必填）..." />
      </a-form-item>
    </a-modal>

    <!-- Evaluation Modal -->
    <a-modal v-model:open="evalModalVisible" title="试用期评价" width="900px" :footer="null" :bodyStyle="{ maxHeight: '75vh', overflowY: 'auto' }">
      <PrdAnnotation v-if="evalModalRecord" id="12">
        <!-- 员工信息 -->
        <a-descriptions bordered size="small" :column="2" style="margin-bottom: 16px">
          <a-descriptions-item label="员工">{{ evalModalRecord.emp_name }}/{{ evalModalRecord.emp_id }}</a-descriptions-item>
          <a-descriptions-item label="入职日期">{{ evalModalRecord.hire_date }}</a-descriptions-item>
          <a-descriptions-item label="部门">{{ evalModalRecord.parent_dept }}\{{ evalModalRecord.dept_name }}</a-descriptions-item>
          <a-descriptions-item label="岗位">{{ evalModalRecord.position }}</a-descriptions-item>
          <a-descriptions-item label="直属上级">{{ evalModalRecord.manager_name }}</a-descriptions-item>
          <a-descriptions-item label="HRBP">{{ evalModalRecord.hrbp_name }}</a-descriptions-item>
          <a-descriptions-item label="试用期评价结果" :span="2">
            <b v-if="evalModalRecord.final_decision" :style="{ color: isFailedDecision(evalModalRecord.final_decision) ? '#f5222d' : '#1890ff' }">
              {{ formatDecisionLabel(evalModalRecord.final_decision) }}
            </b>
            <span v-else style="color: #999">-</span>
          </a-descriptions-item>
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
            <div v-if="goal.weight != null" class="stacked-row">
              <span class="stacked-label">权重</span>
              <span class="stacked-value">{{ goal.weight }}%</span>
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
        <div v-if="evalManagerEval" class="eval-text-block">
          <div class="manager-eval-block">
            <div class="manager-eval-block__result">
              <span>评价结果</span>
              <div>{{ formatDecisionLabel(evalModalRecord.final_decision) }}</div>
            </div>
            <div class="manager-eval-block__content">
              <span>评价内容</span>
              <div>{{ evalManagerEval.content }}</div>
            </div>
          </div>
        </div>
        <a-empty v-else description="暂无上级评价" :image-style="{ height: '40px' }" style="margin-bottom: 16px" />

        <div style="margin-top: 24px; text-align: right">
          <a-button @click="evalModalVisible = false">返回</a-button>
        </div>

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
      </PrdAnnotation>
    </a-modal>

    <!-- 试用期评价弹窗（填写评价） -->
    <a-modal v-model:open="reviewModalVisible" title="试用期评价" width="900px" :footer="null" :bodyStyle="{ maxHeight: '75vh', overflowY: 'auto' }">
      <PrdAnnotation v-if="reviewModalRecord" id="12b">
        <!-- 试用期目标 -->
        <div style="font-weight: 600; margin-bottom: 8px; font-size: 14px">试用期目标</div>
        <div v-if="reviewModalRecord.goals.length > 0" class="stacked-list" style="margin-bottom: 16px">
          <div v-for="(goal, index) in reviewModalRecord.goals" :key="goal.goal_id" class="stacked-item">
            <div class="stacked-goal-title">{{ index + 1 }}. {{ goal.content }}</div>
            <div class="stacked-row">
              <span class="stacked-label">预期结果</span>
              <span class="stacked-value">{{ goal.measure }}</span>
            </div>
            <div v-if="goal.weight != null" class="stacked-row">
              <span class="stacked-label">权重</span>
              <span class="stacked-value">{{ goal.weight }}%</span>
            </div>
            <div class="stacked-row">
              <span class="stacked-label">目标回顾</span>
              <span class="stacked-value">{{ goal.goal_review || '暂无目标回顾' }}</span>
            </div>
          </div>
        </div>
        <a-empty v-else description="暂无目标" :image-style="{ height: '40px' }" style="margin-bottom: 16px" />

        <!-- 员工自评 -->
        <div style="font-weight: 600; margin-bottom: 8px; font-size: 14px">员工自评</div>
        <div v-if="reviewSelfEval" class="eval-text-block" style="margin-bottom: 16px">
          {{ reviewSelfEval.content }}
        </div>
        <a-empty v-else description="员工暂未填写自评" :image-style="{ height: '40px' }" style="margin-bottom: 16px" />

        <!-- 评价表单 -->
        <a-form layout="vertical">
          <a-form-item label="结论" required>
            <a-radio-group v-model:value="reviewDecision" button-style="solid">
              <a-radio-button value="超出预期">通过（超出预期）</a-radio-button>
              <a-radio-button value="符合预期">通过（符合预期）</a-radio-button>
              <a-radio-button value="不符合转正条件">不通过</a-radio-button>
            </a-radio-group>
          </a-form-item>

          <a-form-item label="评价意见" required>
            <a-textarea v-model:value="reviewReason" :rows="4" placeholder="请填写评价意见。" />
          </a-form-item>

          <div style="margin-top: 16px; text-align: right">
            <a-space>
              <a-button @click="reviewModalVisible = false">取消</a-button>
              <a-button type="primary" @click="handleReviewSubmit" :loading="reviewSaving">提交评价</a-button>
            </a-space>
            <div style="text-align: center; margin-top: 8px; color: #999; font-size: 12px">
              提交后将由 HRBP 发起转正审批流程
            </div>
          </div>
        </a-form>
      </PrdAnnotation>
    </a-modal>

    <!-- 阶段性反馈弹窗 -->
    <a-modal v-model:open="stageEvalModalVisible" title="填写阶段性反馈" width="900px" :footer="null">
      <PrdAnnotation v-if="stageEvalRecord" id="11">
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
      </PrdAnnotation>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useProbationStore, ProbationMaster, getStatusColor, getDetailedStatusText, getMonthsSinceHire, getCurrentHandler, formatDecisionLabel, isFailedDecision } from '@/store/probation';
import { message, TreeSelect } from 'ant-design-vue';
import PrdAnnotation from '@/components/prd/PrdAnnotation.vue';
const store = useProbationStore();
const route = useRoute();

const activeTab = ref('unfinished');
const searchText = ref('');
const filterDept = ref<string[]>([]);
const activeTodoFilter = ref<string>('');

const currentStepIndex = ref<number>(0);
const activeStepFilter = ref<string>('all');

// 未转正：排除已结束状态(10/88/99)
const unfinishedRecords = computed(() => store.records.filter(r => !['10', '88'].includes(r.probation_status)));
// 已结束：结果已发布(10) + 未转正离职(88)
const finishedList = computed(() => store.records.filter(r => ['10', '88'].includes(r.probation_status)));
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

const deptTreeData = computed(() => {
  const treeMap = new Map<string, Set<string>>();
  store.records.forEach(r => {
    if (!treeMap.has(r.parent_dept)) treeMap.set(r.parent_dept, new Set());
    treeMap.get(r.parent_dept)!.add(r.dept_name);
  });
  return Array.from(treeMap.entries()).map(([parent, children]) => ({
    title: parent,
    value: parent,
    children: Array.from(children).map(child => ({
      title: child,
      value: `${parent}\\${child}`
    }))
  }));
});

const resetFilters = () => {
  searchText.value = '';
  filterDept.value = [];
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
  if (filterDept.value.length > 0) {
    list = list.filter(r => filterDept.value.includes(r.parent_dept) || filterDept.value.includes(`${r.parent_dept}\\${r.dept_name}`));
  }
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
  { title: '预期结果', dataIndex: 'measure' },
  { title: '权重', dataIndex: 'weight', width: 80, customRender: ({ text }: any) => text != null ? `${text}%` : '-' }
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
const evalSelfEval = computed(() => {
  if (!evalModalRecord.value) return null;
  return (evalModalRecord.value.evaluations || []).find((e: any) => e.eval_type === 'self') || null;
});

const evalManagerEval = computed(() => {
  if (!evalModalRecord.value) return null;
  return (evalModalRecord.value.evaluations || []).find((e: any) => e.eval_type === 'manager') || null;
});

const openEvalModal = (record: ProbationMaster) => {
  evalModalRecord.value = record;
  evalModalVisible.value = true;
};

// 试用期评价弹窗（填写评价）
const reviewModalVisible = ref(false);
const reviewModalRecord = ref<ProbationMaster | null>(null);
const reviewDecision = ref<'超出预期' | '符合预期' | '不符合转正条件'>('符合预期');
const reviewReason = ref('');
const reviewSaving = ref(false);

const reviewSelfEval = computed(() => {
  if (!reviewModalRecord.value) return null;
  return (reviewModalRecord.value.evaluations || []).find((e: any) => e.eval_type === 'self') || null;
});

const openReviewModal = (record: ProbationMaster) => {
  reviewModalRecord.value = record;
  reviewDecision.value = '符合预期';
  reviewReason.value = '';
  reviewModalVisible.value = true;
};

const handleReviewSubmit = () => {
  if (!reviewReason.value.trim()) {
    message.error('请填写评价意见');
    return;
  }
  reviewSaving.value = true;
  setTimeout(() => {
    store.submitManagerEval(reviewModalRecord.value!.master_id, reviewReason.value, reviewDecision.value);
    message.success(isFailedDecision(reviewDecision.value) ? '员工试用期评估结果为【不通过】，将进入试用期终止流程' : '员工试用期评估结果为【通过】，请关注后续流程进展');
    reviewSaving.value = false;
    reviewModalVisible.value = false;
  }, 800);
};

// 阶段性反馈弹窗
const stageEvalModalVisible = ref(false);
const stageEvalRecord = ref<ProbationMaster | null>(null);
const stageEvalContent = ref('');

const stageGoalColumns = [
  { title: '序号', dataIndex: 'seq', width: 60, customRender: ({ index }: any) => index + 1 },
  { title: '目标内容', dataIndex: 'content' },
  { title: '预期结果', dataIndex: 'measure', width: 200 },
  { title: '权重', dataIndex: 'weight', width: 80, customRender: ({ text }: any) => text != null ? `${text}%` : '-' }
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
  store.addStageEvaluation(stageEvalRecord.value.master_id, '陈思远', stageEvalContent.value);
  message.success('阶段性反馈已提交');
  stageEvalModalVisible.value = false;
  stageEvalContent.value = '';
};

function syncPrdRoute(prdQuery: unknown) {
  const prdId = Number(prdQuery);
  if (!Number.isFinite(prdId)) return;

  activeTab.value = 'unfinished';

  if (prdId === 10) {
    const record = sortedUnfinished.value.find(r => r.probation_status === '02') ?? sortedUnfinished.value[0];
    if (record) openGoalModal(record);
  } else if (prdId === 11) {
    const record = sortedUnfinished.value.find(r => ['02', '03', '04'].includes(r.probation_status)) ?? sortedUnfinished.value[0];
    if (record) openStageEvalModal(record);
  } else if (prdId === 12) {
    const record = sortedUnfinished.value.find(r => r.probation_status === '06') ?? sortedUnfinished.value[0];
    if (record) openEvalModal(record);
  }
}

onMounted(() => {
  syncPrdRoute(route.query.prd);
});

watch(() => route.query.prd, syncPrdRoute);
</script>

<style scoped>
/* Apple-style manager dashboard */

/* Custom steps filter bar */
.custom-steps {
  cursor: pointer;
}

.custom-steps :deep(.ant-steps-item) {
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-default);
  padding: 0 4px;
}

.custom-steps :deep(.ant-steps-item:hover) {
  opacity: 0.8;
}

.custom-steps :deep(.ant-steps-item-title) {
  font-size: 13px !important;
  line-height: 22px;
  padding: 0;
  color: var(--text-secondary) !important;
}

.custom-steps :deep(.ant-steps-item-process .ant-steps-item-title) {
  color: var(--text-primary) !important;
  font-weight: 500 !important;
}

.custom-steps :deep(.ant-steps-item-description) {
  font-weight: 600;
  color: var(--accent) !important;
}

.custom-steps :deep(.ant-steps-item-icon) {
  display: none;
}

.custom-steps :deep(.ant-steps-item-tail) {
  padding: 0;
  top: 11px;
}

/* Stacked list for goal details */
.stacked-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.stacked-item {
  padding: var(--space-3) var(--space-4);
  border: 1px solid var(--border-tertiary);
  border-radius: var(--radius-md);
  background: var(--bg-tertiary);
}

.stacked-row {
  display: grid;
  grid-template-columns: 72px 1fr;
  gap: var(--space-2) var(--space-3);
  padding: var(--space-2) 0;
  border-top: 1px solid var(--border-tertiary);
}

.stacked-row:first-child {
  border-top: none;
  padding-top: 0;
}

.stacked-row:last-child {
  padding-bottom: 0;
}

.stacked-label {
  color: var(--text-secondary);
  font-weight: 500;
  white-space: nowrap;
  font-size: 13px;
}

.stacked-value {
  color: var(--text-primary);
  line-height: 1.6;
  word-break: break-word;
  font-size: 14px;
}

.stacked-value--index {
  font-weight: 600;
  color: var(--accent);
}

.stacked-goal-title {
  padding-bottom: var(--space-2);
  color: var(--text-primary);
  font-size: 13px;
  font-weight: 600;
  line-height: 1.6;
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
  padding: var(--space-3) var(--space-4);
  border: 1px solid var(--border-tertiary);
  border-radius: var(--radius-md);
  background: var(--bg-tertiary);
}

/* Approval records */
.approval-records-section {
  margin-top: var(--space-4);
}

.approval-records-title {
  font-weight: 600;
  margin-bottom: var(--space-3);
  font-size: 14px;
  color: var(--text-primary);
}

.approval-record-item {
  padding: var(--space-3);
  background: var(--bg-tertiary);
  border-radius: var(--radius-md);
  margin-bottom: var(--space-2);
}

.approval-record-item__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-1);
}

.approval-record-item__node {
  font-weight: 500;
  color: var(--text-primary);
  font-size: 14px;
}

.approval-record-item__action {
  font-weight: 500;
  font-size: 13px;
}

.approval-record-item__action--agree {
  color: var(--status-success);
}

.approval-record-item__action--reject {
  color: var(--status-danger);
}

.approval-record-item__info {
  font-size: 13px;
  color: var(--text-secondary);
  display: flex;
  gap: var(--space-3);
}

.approval-record-item__time {
  color: var(--text-tertiary);
}

.approval-record-item__comment {
  margin-top: var(--space-2);
  font-size: 13px;
  color: var(--text-primary);
  padding: var(--space-2) var(--space-3);
  background: var(--bg-primary);
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-tertiary);
  line-height: 1.5;
}

.approval-record-empty {
  color: var(--text-tertiary);
  font-size: 13px;
  text-align: center;
  padding: var(--space-4);
}

/* Manager evaluation block */
.manager-eval-block {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.manager-eval-block__result,
.manager-eval-block__content {
  display: grid;
  grid-template-columns: 88px 1fr;
  gap: var(--space-3);
  align-items: start;
}

.manager-eval-block__result > span,
.manager-eval-block__content > span {
  color: var(--text-secondary);
  font-weight: 500;
  font-size: 13px;
}

.manager-eval-block__result > div,
.manager-eval-block__content > div {
  white-space: pre-wrap;
  line-height: 1.6;
  font-size: 14px;
  color: var(--text-primary);
}

/* Responsive steps */
@media (max-width: 768px) {
  .custom-steps {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }

  .custom-steps :deep(.ant-steps-item-title) {
    font-size: 11px !important;
  }
}
</style>
