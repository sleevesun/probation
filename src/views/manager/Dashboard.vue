<template>
  <div>
    <a-page-header title="团队试用期管理看板" sub-title="下属的试用期跟踪与任务处理" />

    <!-- 待办摘要区 -->
    <a-card style="margin-top: 16px" :bodyStyle="{ padding: '16px 20px' }">
      <div class="todo-summary">
        <div class="todo-summary__header">
          <div class="todo-summary__title">你的待办</div>
        </div>
        <div class="todo-summary__tags">
          <button type="button" 
                  class="todo-tag todo-tag--warning" 
                  :class="{'todo-tag--active': activeTodoFilter === '02'}"
                  @click="onTodoClick('02')">
            <span class="todo-tag__label">待确认目标</span>
            <span class="todo-tag__count">{{ managerTodoConfirmCount }}</span>
          </button>
          
          <button type="button" 
                  class="todo-tag todo-tag--danger" 
                  :class="{'todo-tag--active': activeTodoFilter === '06'}"
                  @click="onTodoClick('06')">
            <span class="todo-tag__label">待完成评价</span>
            <span class="todo-tag__count">{{ managerTodoEvalCount }}</span>
          </button>
        </div>
      </div>
    </a-card>

    <!-- Tabs -->
    <a-card style="margin-top: 16px">
      <a-tabs v-model:activeKey="activeTab">
        <!-- 未转正 Tab -->
        <a-tab-pane key="unfinished" tab="未转正">
          <!-- 流程轴过滤 -->
          <div style="margin-bottom: 24px; padding: 16px; background: #fafafa; border-radius: 8px;">
            <a-steps :current="currentStepIndex" @change="onStepChange" type="navigation" size="small" class="custom-steps">
              <a-step :title="`全部(${stepCounts.all})`" />
              <a-step :title="`待设定目标(${stepCounts.s01})`" />
              <a-step :title="`已设定目标(${stepCounts.s02_03})`" />
              <a-step :title="`待发起流程(${stepCounts.s04})`" />
              <a-step :title="`待员工自评(${stepCounts.s05})`" />
              <a-step :title="`待评价(${stepCounts.s06})`" />
              <a-step :title="`审批中(${stepCounts.s08})`" />
              <a-step :title="`待发布(${stepCounts.s09})`" />
            </a-steps>
          </div>

          <a-form layout="inline" style="margin-bottom: 16px; flex-wrap: wrap; gap: 8px">
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
              <template v-if="column.dataIndex === 'tenure'">{{ getMonthsSinceHire(record.hire_date) }} 个月</template>
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
                  <a-button v-if="record.probation_status === '06' && !record.manager_eval_done" type="primary" size="small" @click="router.push(`/manager/evaluation/${record.master_id}`)">转正评价</a-button>
                  <a-button v-if="record.probation_status === '06' && record.manager_eval_done" type="text" size="small">已完成评价</a-button>
                  <a-button v-if="['03'].includes(record.probation_status)" type="text" danger size="small" @click="forceReturn(record)">要求调整</a-button>
                  <a-button type="link" size="small" @click="router.push(`/manager/evaluation/${record.master_id}`)">查看详情</a-button>
                </a-space>
              </template>
            </template>
          </a-table>
        </a-tab-pane>

        <!-- 已转正 Tab -> 已完成 Tab -->
        <a-tab-pane key="finished" tab="已完成">
          <a-table :dataSource="finishedList" :columns="finishedColumns" rowKey="master_id" bordered size="middle">
            <template #bodyCell="{ column, record }">
              <template v-if="column.dataIndex === 'dept_display'">{{ record.parent_dept }}\{{ record.dept_name }}</template>
              <template v-if="column.dataIndex === 'tenure'">{{ getMonthsSinceHire(record.hire_date) }} 个月</template>
              <template v-if="column.dataIndex === 'final_decision'">
                <a-tag :color="record.final_decision === '不符合录用条件' ? 'error' : 'success'">{{ record.final_decision || '-' }}</a-tag>
              </template>
              <template v-if="column.key === 'action'">
                <a-button type="link" size="small" @click="router.push(`/manager/evaluation/${record.master_id}`)">查看详情</a-button>
              </template>
            </template>
          </a-table>
        </a-tab-pane>
      </a-tabs>
    </a-card>

    <!-- Goal Approval Modal -->
    <a-modal v-model:open="goalModalVisible" title="试用期考核目标确认" width="800px" :footer="null">
      <div v-if="currentReviewRecord">
        <a-descriptions bordered size="small" :column="2" style="margin-bottom: 16px">
          <a-descriptions-item label="员工姓名">{{ currentReviewRecord.emp_name }}</a-descriptions-item>
          <a-descriptions-item label="岗位">{{ currentReviewRecord.position }}</a-descriptions-item>
          <a-descriptions-item label="部门">{{ currentReviewRecord.parent_dept }}\{{ currentReviewRecord.dept_name }}</a-descriptions-item>
          <a-descriptions-item label="入职时间">{{ currentReviewRecord.hire_date }}</a-descriptions-item>
        </a-descriptions>

        <a-table :dataSource="currentReviewRecord.goals" :columns="goalColumns" :pagination="false" rowKey="goal_id" size="small" bordered />

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
            <a-button type="primary" @click="handleConfirm" v-if="!showRejectInput">同意锁定</a-button>
          </a-space>
        </div>
      </div>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useProbationStore, ProbationMaster, STATUS_COLOR, getDetailedStatusText, getMonthsSinceHire, getCurrentHandler } from '@/store/probation';
import { message, Modal } from 'ant-design-vue';

const router = useRouter();
const store = useProbationStore();

const activeTab = ref('unfinished');
const searchText = ref('');
const filterDept = ref<string | undefined>(undefined);
const activeTodoFilter = ref<string>('');

const currentStepIndex = ref<number>(0);
const activeStepFilter = ref<string>('all');

// 已转正 = 结果已发布 (10)
const unfinishedRecords = computed(() => store.records.filter(r => r.probation_status !== '10'));
const finishedList = computed(() => store.records.filter(r => r.probation_status === '10'));

const formatCount = (count: number) => count > 0 ? count : '-';

const stepCounts = computed(() => {
  // 只统计当前主管下属的数据
  // 这里简化处理，因为 mock 数据中 manager_name 都是 '李四'
  const records = store.records;
  return {
    all: formatCount(unfinishedRecords.value.length),
    s01: formatCount(records.filter(r => r.probation_status === '01').length),
    s02_03: formatCount(records.filter(r => ['02', '03'].includes(r.probation_status)).length),
    s04: formatCount(records.filter(r => r.probation_status === '04').length),
    s05: formatCount(records.filter(r => r.probation_status === '05').length),
    s06: formatCount(records.filter(r => r.probation_status === '06').length),
    s08: formatCount(records.filter(r => r.probation_status === '08').length),
    s09: formatCount(records.filter(r => r.probation_status === '09').length)
  };
});

const onStepChange = (current: number) => {
  currentStepIndex.value = current;
  const stepMap = ['all', '01', '02_03', '04', '05', '06', '08', '09'];
  const filterVal = stepMap[current];
  
  activeTab.value = 'unfinished';
  activeStepFilter.value = filterVal;
  activeTodoFilter.value = '';
};

const managerTodoConfirmCount = computed(() => store.records.filter(r => r.probation_status === '02').length);
const managerTodoEvalCount = computed(() => store.records.filter(r => r.probation_status === '06' && !r.manager_eval_done).length);

const onTodoClick = (filterKey: string) => {
  activeTodoFilter.value = activeTodoFilter.value === filterKey ? '' : filterKey;
  activeTab.value = 'unfinished';
  activeStepFilter.value = 'all';
  currentStepIndex.value = 0;
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
};

const filteredUnfinished = computed(() => {
  let list = unfinishedRecords.value;
  
  // 1. 流程轴过滤
  if (activeStepFilter.value !== 'all') {
    if (activeStepFilter.value === '02_03') {
      list = list.filter(r => ['02', '03'].includes(r.probation_status));
    } else {
      list = list.filter(r => r.probation_status === activeStepFilter.value);
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

// 排序: 主管待办(02:待确认, 06:待上级评价) -> 04(待发起) -> 入职日期asc
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
  { title: '操作', key: 'action', width: 240 }
];

const finishedColumns = [
  { title: '姓名', dataIndex: 'emp_name', width: 90 },
  { title: '工号', dataIndex: 'emp_id', width: 80 },
  { title: '岗位', dataIndex: 'position', width: 130 },
  { title: '直属部门', dataIndex: 'dept_display', width: 160 },
  { title: '入职日期', dataIndex: 'hire_date', width: 110 },
  { title: '入职时长', dataIndex: 'tenure', width: 100 },
  { title: '结论', dataIndex: 'final_decision', width: 130 },
  { title: '操作', key: 'action', width: 100 }
];

const goalColumns = [
  { title: '维度', dataIndex: 'dimension', width: 100 },
  { title: '目标内容', dataIndex: 'content' },
  { title: '权重', dataIndex: 'weight', width: 80, customRender: ({text}: any) => `${text}%` }
];

const goalModalVisible = ref(false);
const currentReviewRecord = ref<ProbationMaster | null>(null);
const showRejectInput = ref(false);
const rejectComment = ref('');

const openGoalModal = (record: ProbationMaster) => {
  currentReviewRecord.value = record; showRejectInput.value = false; rejectComment.value = ''; goalModalVisible.value = true;
};

const handleConfirm = () => {
  if (currentReviewRecord.value) { store.confirmGoals(currentReviewRecord.value.master_id); message.success('已同意目标'); goalModalVisible.value = false; }
};

const handleReject = () => {
  if (currentReviewRecord.value && rejectComment.value.trim()) {
    store.returnGoals(currentReviewRecord.value.master_id, rejectComment.value);
    message.warning('已退回修改，退回意见已通知员工'); goalModalVisible.value = false;
  }
};

const forceReturn = (record: ProbationMaster) => {
  Modal.confirm({
    title: '确认要解锁目标要求员工重新调整吗？',
    content: '解锁后流程将打回至"待设定目标"步骤',
    onOk() { store.returnGoals(record.master_id, '主管要求调整目标'); message.success('已解锁打回'); }
  });
};
</script>

<style scoped>
.todo-summary {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.todo-summary__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.todo-summary__title {
  font-size: 16px;
  font-weight: 600;
  color: #1f1f1f;
}

.todo-summary__hint {
  margin-top: 4px;
  font-size: 12px;
  color: #8c8c8c;
}

.todo-summary__total {
  display: flex;
  align-items: baseline;
  gap: 6px;
  color: #1f1f1f;
}

.todo-summary__total-value {
  font-size: 28px;
  line-height: 1;
  font-weight: 700;
  color: #1677ff;
}

.todo-summary__total-label,
.todo-summary__meta {
  font-size: 12px;
  color: #8c8c8c;
}

.todo-summary__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.todo-tag {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 32px;
  padding: 6px 12px;
  border: 1px solid transparent;
  border-radius: 999px;
  background: #f5f5f5;
  color: #595959;
  cursor: pointer;
  transition: all 0.2s ease;
}

.todo-tag__label {
  font-size: 13px;
}

.todo-tag__count {
  min-width: 18px;
  font-size: 13px;
  font-weight: 600;
}

.todo-tag--warning {
  background: #fff7e6;
  color: #ad6800;
}

.todo-tag--danger {
  background: #fff1f0;
  color: #cf1322;
}

.todo-tag--default {
  background: #f5f5f5;
  color: #595959;
}

.todo-tag--active {
  border-color: #1677ff;
  box-shadow: 0 0 0 2px rgba(22, 119, 255, 0.12);
}

/* 自定义步骤条样式，使其更适合作为过滤栏 */
.custom-steps {
  cursor: pointer;
}
.custom-steps :deep(.ant-steps-item) {
  cursor: pointer;
  transition: opacity 0.3s;
}
.custom-steps :deep(.ant-steps-item:hover) {
  opacity: 0.8;
}
.custom-steps :deep(.ant-steps-item-description) {
  font-weight: bold;
  color: #1890ff;
}
/* 隐藏默认序号圆圈 */
.custom-steps :deep(.ant-steps-item-icon) {
  display: none;
}
</style>
