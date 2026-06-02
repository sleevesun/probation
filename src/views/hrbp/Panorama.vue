<template>
  <div class="workbench-page">
    <a-page-header title="试用期全景管理" sub-title="聚焦待办处理，必要时再进入全量进度" />

    <!-- Tabs -->
    <a-card class="workbench-card">
      <a-tabs v-model:activeKey="activeTab" class="workbench-tabs">
        <a-tab-pane key="todo" tab="待办">
          <a-table :dataSource="todoRecords" :columns="todoColumns" rowKey="master_id" size="middle" :pagination="false" class="light-table">
            <template #bodyCell="{ column, record }">
              <template v-if="column.dataIndex === 'todo_type'">
                <a-tag :color="record.probation_status === '04' ? 'gold' : record.probation_status === '07' ? 'cyan' : record.probation_status === '09' ? 'green' : 'blue'">
                  {{ getTodoType(record) }}
                </a-tag>
              </template>
              <template v-if="column.dataIndex === 'dept_display'">{{ record.parent_dept }}\{{ record.dept_name }}</template>
              <template v-if="column.dataIndex === 'tenure'">{{ getMonthsSinceHire(record.hire_date) }} 个月</template>
              <template v-if="column.key === 'action'">
                <a-space>
                  <a-button v-if="record.probation_status === '04'" type="primary" size="small" @click="handleTrigger(record.master_id)">开启评估</a-button>
                  <a-button v-if="record.probation_status === '04'" size="small" @click="handleHold(record.master_id)">暂不开启</a-button>
                  <a-button v-if="record.probation_status === '07'" type="primary" size="small" @click="handleTriggerApproval(record.master_id)">发起审批</a-button>
                  <a-button v-if="record.probation_status === '09'" type="primary" size="small" @click="openPublishModal(record)">发布结果</a-button>
                  <a-button type="link" size="small" @click="router.push('/manager/evaluation/' + record.master_id)">查看详情</a-button>
                </a-space>
              </template>
            </template>
          </a-table>

          <a-empty v-if="todoRecords.length === 0" description="当前没有待办" />
        </a-tab-pane>

        <a-tab-pane key="unfinished" tab="未转正">
          <!-- 流程轴过滤 -->
          <div style="margin-bottom: 12px; padding: 6px 12px; background: #fafafa; border-radius: 8px;">
            <a-steps :current="currentStepIndex" @change="onStepChange" type="navigation" size="small" class="custom-steps">
              <a-step :title="`全部(${stepCounts.all})`" />
              <a-step :title="`目标制定(${stepCounts.s01_03})`" />
              <a-step :title="`试用期评估(${stepCounts.s04_07})`" />
              <a-step :title="`转正审批(${stepCounts.s08_09})`" />
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
            <a-form-item><a-button @click="resetFilters">重置</a-button></a-form-item>
          </a-form>

          <a-table :dataSource="sortedUnfinished" :columns="columns" rowKey="master_id" bordered size="middle">
            <template #bodyCell="{ column, record }">
              <template v-if="column.dataIndex === 'dept_display'">{{ record.parent_dept }}\{{ record.dept_name }}</template>
              <template v-if="column.dataIndex === 'tenure'">{{ getMonthsSinceHire(record.hire_date) }} 个月</template>
              <template v-if="column.dataIndex === 'probation_status'">
                <a-tag :color="STATUS_COLOR[record.probation_status]">{{ getDetailedStatusText(record) }}</a-tag>
              </template>
              <template v-if="column.dataIndex === 'current_handler'">
                {{ getCurrentHandler(record) }}
              </template>
              <template v-if="column.key === 'action'">
                <a-space>
                  <a-button v-if="record.probation_status === '04'" type="primary" size="small" @click="handleTrigger(record.master_id)">开启转正流程</a-button>
                  <a-button v-if="record.probation_status === '04'" type="dashed" danger size="small" @click="handleHold(record.master_id)">暂不开启</a-button>
                  <a-button v-if="record.probation_status === '07'" type="primary" size="small" @click="handleTriggerApproval(record.master_id)">发起审批</a-button>
                  <a-button v-if="record.probation_status === '09'" type="primary" size="small" @click="openPublishModal(record)">发布结果</a-button>
                  <a-button type="link" size="small" @click="router.push('/manager/evaluation/' + record.master_id)">查看详情</a-button>
                </a-space>
              </template>
            </template>
          </a-table>
        </a-tab-pane>

        <a-tab-pane key="finished" tab="已完成">
          <a-table :dataSource="finishedList" :columns="finishedColumns" rowKey="master_id" bordered size="middle">
            <template #bodyCell="{ column, record }">
              <template v-if="column.dataIndex === 'dept_display'">{{ record.parent_dept }}\{{ record.dept_name }}</template>
              <template v-if="column.dataIndex === 'tenure'">{{ getMonthsSinceHire(record.hire_date) }} 个月</template>
              <template v-if="column.dataIndex === 'final_decision'">
                <a-tag :color="record.final_decision === '不符合录用条件' ? 'error' : 'success'">{{ record.final_decision || '-' }}</a-tag>
              </template>
              <template v-if="column.key === 'action'"><a-button type="link" size="small">查看档案</a-button></template>
            </template>
          </a-table>
        </a-tab-pane>
      </a-tabs>
    </a-card>

    <!-- 发布结果 Modal -->
    <a-modal v-model:open="publishModalVisible" title="发布转正结果" width="700px" :footer="null">
      <div v-if="currentRecord">
        <a-descriptions bordered size="small" :column="2" style="margin-bottom: 16px">
          <a-descriptions-item label="员工">{{ currentRecord.emp_name }} ({{ currentRecord.emp_id }})</a-descriptions-item>
          <a-descriptions-item label="转正结论">
            <a-tag :color="currentRecord.final_decision === '不符合录用条件' ? 'error' : 'success'">{{ currentRecord.final_decision }}</a-tag>
          </a-descriptions-item>
        </a-descriptions>

        <!-- 上级评价内容 -->
        <a-card size="small" title="上级评价内容（HRBP 可查阅）" style="margin-bottom: 16px; background: #f6ffed">
          <div v-if="currentManagerEval" style="white-space: pre-wrap;">{{ currentManagerEval.content }}</div>
          <a-empty v-else description="暂无上级评价" />
        </a-card>

        <a-alert
          v-if="isOverSixMonths"
          type="warning" show-icon style="margin-bottom: 16px"
          message="超期提醒"
          description="该员工试用期已超过 6 个月，如不发布，系统将在 3 个工作日后自动发布结果。"
        />

        <a-form layout="vertical">
          <a-form-item>
            <a-checkbox v-model:checked="allowViewEval">允许员工查看上级评价内容</a-checkbox>
          </a-form-item>
          <div style="text-align: right">
            <a-space>
              <a-button @click="publishModalVisible = false">暂不发布</a-button>
              <a-button type="primary" @click="handlePublish">确认发布结果</a-button>
            </a-space>
          </div>
        </a-form>
      </div>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useProbationStore, ProbationMaster, STATUS_COLOR, getDetailedStatusText, getMonthsSinceHire, getCurrentHandler } from '@/store/probation';
import { message } from 'ant-design-vue';

const router = useRouter();
const store = useProbationStore();
const activeTab = ref('todo');
const searchText = ref('');
const filterDept = ref<string | undefined>(undefined);
const activeTodoFilter = ref<string>('');

const currentStepIndex = ref<number>(0);
const activeStepFilter = ref<string>('all');

const unfinishedRecords = computed(() => store.records.filter(r => r.probation_status !== '10'));
const finishedList = computed(() => store.records.filter(r => r.probation_status === '10'));

const formatCount = (count: number) => count > 0 ? count : '-';

const stepCounts = computed(() => {
  const records = store.records;
  return {
    all: formatCount(unfinishedRecords.value.length),
    s01_03: formatCount(records.filter(r => ['01', '02', '03'].includes(r.probation_status)).length),
    s04_07: formatCount(records.filter(r => ['04', '05', '06', '07'].includes(r.probation_status)).length),
    s08_09: formatCount(records.filter(r => ['08', '09'].includes(r.probation_status)).length)
  };
});

const onStepChange = (current: number) => {
  currentStepIndex.value = current;
  const stepMap = ['all', '01_03', '04_07', '08_09'];
  const filterVal = stepMap[current];

  activeTab.value = 'unfinished';
  activeStepFilter.value = filterVal;
  activeTodoFilter.value = '';
};

const todoRecords = computed(() => store.records.filter(r => ['04', '07', '09'].includes(r.probation_status)));

const getTodoType = (record: ProbationMaster) => {
  if (record.probation_status === '04') return '待开启评估';
  if (record.probation_status === '07') return '待发起审批';
  if (record.probation_status === '09') return '待发布结果';
  return '待处理';
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
    if (activeStepFilter.value === '01_03') {
      list = list.filter(r => ['01', '02', '03'].includes(r.probation_status));
    } else if (activeStepFilter.value === '04_07') {
      list = list.filter(r => ['04', '05', '06', '07'].includes(r.probation_status));
    } else if (activeStepFilter.value === '08_09') {
      list = list.filter(r => ['08', '09'].includes(r.probation_status));
    }
  }

  if (activeTodoFilter.value) {
    if (activeTodoFilter.value === '04') list = list.filter(r => r.probation_status === '04');
    if (activeTodoFilter.value === '07') list = list.filter(r => r.probation_status === '07');
    if (activeTodoFilter.value === '09') list = list.filter(r => r.probation_status === '09');
  }

  // 2. 表单过滤
  if (searchText.value) {
    const kw = searchText.value.toLowerCase();
    list = list.filter(r => r.emp_name.toLowerCase().includes(kw) || r.emp_id.toLowerCase().includes(kw));
  }
  if (filterDept.value) list = list.filter(r => `${r.parent_dept}\\${r.dept_name}` === filterDept.value);
  return list;
});

// HRBP sort: 04(待发起) & 09(待发布) first -> rest by hire_date
const sortedUnfinished = computed(() => {
  return [...filteredUnfinished.value].sort((a, b) => {
    const pa = getHRBPPriority(a); const pb = getHRBPPriority(b);
    if (pa !== pb) return pa - pb;
    return new Date(a.hire_date).getTime() - new Date(b.hire_date).getTime();
  });
});

function getHRBPPriority(r: ProbationMaster): number {
  if (r.probation_status === '04') return 0;
  if (r.probation_status === '07') return 0;
  if (r.probation_status === '09') return 0;
  return 1;
}

const columns = [
  { title: '姓名', dataIndex: 'emp_name', width: 90 },
  { title: '工号', dataIndex: 'emp_id', width: 80 },
  { title: '岗位', dataIndex: 'position', width: 130 },
  { title: '直属部门', dataIndex: 'dept_display', width: 160 },
  { title: '直属主管', dataIndex: 'manager_name', width: 80 },
  { title: '入职日期', dataIndex: 'hire_date', width: 110 },
  { title: '入职时长', dataIndex: 'tenure', width: 100 },
  { title: '当前处理人', dataIndex: 'current_handler', width: 120 },
  { title: '当前状态', dataIndex: 'probation_status', width: 150 },
  { title: '操作', key: 'action', width: 240 }
];

const todoColumns = [
  { title: '待办类型', dataIndex: 'todo_type', width: 100 },
  { title: '姓名', dataIndex: 'emp_name', width: 90 },
  { title: '岗位', dataIndex: 'position', width: 140 },
  { title: '直属主管', dataIndex: 'manager_name', width: 100 },
  { title: '直属部门', dataIndex: 'dept_display' },
  { title: '入职时长', dataIndex: 'tenure', width: 100 },
  { title: '操作', key: 'action', width: 240 }
];

const finishedColumns = [
  { title: '姓名', dataIndex: 'emp_name', width: 90 },
  { title: '工号', dataIndex: 'emp_id', width: 80 },
  { title: '岗位', dataIndex: 'position', width: 130 },
  { title: '直属部门', dataIndex: 'dept_display', width: 160 },
  { title: '入职日期', dataIndex: 'hire_date', width: 110 },
  { title: '结论', dataIndex: 'final_decision', width: 130 },
  { title: '操作', key: 'action', width: 100 }
];

// Publish result modal
const currentRecord = ref<ProbationMaster | null>(null);
const currentManagerEval = computed(() => currentRecord.value?.evaluations.find(e => e.eval_type === 'manager'));
const publishModalVisible = ref(false);
const allowViewEval = ref(false);

const isOverSixMonths = computed(() => {
  if (!currentRecord.value) return false;
  const months = parseFloat(getMonthsSinceHire(currentRecord.value.hire_date));
  return months >= 6;
});

const openPublishModal = (record: ProbationMaster) => {
  currentRecord.value = record; allowViewEval.value = false; publishModalVisible.value = true;
};

const handlePublish = () => {
  if (currentRecord.value) {
    store.publishResult(currentRecord.value.master_id, allowViewEval.value);
    message.success('结果已发布！' + (allowViewEval.value ? '员工可查看上级评价。' : '员工不可查看上级评价。'));
    publishModalVisible.value = false;
  }
};

const handleTrigger = (id: string) => { store.triggerProbation(id); message.success('已为该员工开启转正自评流程'); };
const handleHold = (id: string) => { store.holdProbation(id); message.warning('已挂起'); };
const handleTriggerApproval = (id: string) => { store.triggerApproval(id); message.success('已发起转正审批流程'); };
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
</style>
