<template>
  <div>
    <a-page-header title="团队试用期管理看板" sub-title="下属的试用期跟踪与任务处理" />

    <!-- 统计卡片 -->
    <a-row :gutter="16" style="margin-top: 16px">
      <a-col :span="8">
        <a-card hoverable @click="onStatClick('')" :class="{ 'stat-active': activeStatFilter === '' }">
          <a-statistic title="全部试用期人数" :value="allUnfinishedCount" :value-style="{ color: '#1890ff', cursor: 'pointer' }" />
        </a-card>
      </a-col>
      <a-col :span="8">
        <a-card hoverable @click="onStatClick('02')" :class="{ 'stat-active': activeStatFilter === '02' }">
          <a-statistic title="待确认人数" :value="pendingConfirmCount" :value-style="{ color: '#fa8c16', cursor: 'pointer' }" />
        </a-card>
      </a-col>
      <a-col :span="8">
        <a-card hoverable @click="onStatClick('eval')" :class="{ 'stat-active': activeStatFilter === 'eval' }">
          <a-statistic title="待评价人数" :value="pendingEvalCount" :value-style="{ color: '#f5222d', cursor: 'pointer' }" />
        </a-card>
      </a-col>
    </a-row>

    <!-- Tabs -->
    <a-card style="margin-top: 16px">
      <a-tabs v-model:activeKey="activeTab">
        <!-- 未转正 Tab -->
        <a-tab-pane key="unfinished" tab="未转正">
          <a-form layout="inline" style="margin-bottom: 16px; flex-wrap: wrap; gap: 8px">
            <a-form-item label="搜索">
              <a-input v-model:value="searchText" placeholder="姓名 / 工号" allow-clear style="width: 180px" />
            </a-form-item>
            <a-form-item label="部门">
              <a-select v-model:value="filterDept" placeholder="全部部门" allow-clear style="width: 180px">
                <a-select-option v-for="d in deptOptions" :key="d" :value="d">{{ d }}</a-select-option>
              </a-select>
            </a-form-item>
            <a-form-item label="状态">
              <a-select v-model:value="filterStatus" placeholder="全部状态" allow-clear style="width: 200px">
                <a-select-option v-for="(label, key) in unfinishedStatusOptions" :key="key" :value="key">{{ label }}</a-select-option>
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
const filterStatus = ref<string | undefined>(undefined);
const activeStatFilter = ref<string>('');

// 已转正 = 结果已发布 (10)
const unfinishedRecords = computed(() => store.records.filter(r => r.probation_status !== '10'));
const finishedList = computed(() => store.records.filter(r => r.probation_status === '10'));

const allUnfinishedCount = computed(() => unfinishedRecords.value.length);
const pendingConfirmCount = computed(() => store.records.filter(r => r.probation_status === '02').length);
const pendingEvalCount = computed(() => store.records.filter(r => r.probation_status === '06' && !r.manager_eval_done).length);

const onStatClick = (status: string) => {
  activeStatFilter.value = status;
  activeTab.value = 'unfinished';
  if (status === 'eval') {
    // special: filter 06 where manager hasn't eval'd
    filterStatus.value = '06';
  } else {
    filterStatus.value = status || undefined;
  }
};

const deptOptions = computed(() => {
  const depts = new Set(store.records.map(r => `${r.parent_dept}\\${r.dept_name}`));
  return Array.from(depts);
});

const unfinishedStatusOptions: Record<string, string> = {
  '01': '待设定目标', '02': '目标待确认', '03': '目标已确认',
  '04': '待发起转正流程', '05': '待员工自评', '06': '评价阶段',
  '08': '转正流程审批', '09': '待发布结果', '99': '已挂起'
};

const resetFilters = () => { searchText.value = ''; filterDept.value = undefined; filterStatus.value = undefined; activeStatFilter.value = ''; };

const filteredUnfinished = computed(() => {
  let list = unfinishedRecords.value;
  if (searchText.value) {
    const kw = searchText.value.toLowerCase();
    list = list.filter(r => r.emp_name.toLowerCase().includes(kw) || r.emp_id.toLowerCase().includes(kw));
  }
  if (filterDept.value) list = list.filter(r => `${r.parent_dept}\\${r.dept_name}` === filterDept.value);
  if (filterStatus.value) list = list.filter(r => r.probation_status === filterStatus.value);
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
.stat-active { border-color: #1890ff; box-shadow: 0 0 0 2px rgba(24,144,255,.2); }
</style>
