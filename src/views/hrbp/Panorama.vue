<template>
  <div>
    <a-page-header title="试用期全景看板" sub-title="管辖范围内新员工试用期全域数据监控" />

    <!-- 统计卡片 -->
    <a-row :gutter="16" style="margin-top: 16px">
      <a-col :span="6">
        <a-card hoverable @click="onStatClick('')" :class="{ 'stat-active': activeStatFilter === '' }">
          <a-statistic title="全部试用期人数" :value="allUnfinishedCount" :value-style="{ color: '#1890ff', cursor: 'pointer' }" />
        </a-card>
      </a-col>
      <a-col :span="6">
        <a-card hoverable @click="onStatClick('04')" :class="{ 'stat-active': activeStatFilter === '04' }">
          <a-statistic title="待发起转正流程" :value="pendingTriggerCount" :value-style="{ color: '#fa8c16', cursor: 'pointer' }" />
        </a-card>
      </a-col>
      <a-col :span="6">
        <a-card hoverable @click="onStatClick('hrbp_eval')" :class="{ 'stat-active': activeStatFilter === 'hrbp_eval' }">
          <a-statistic title="待HRBP评价" :value="pendingHRBPEvalCount" :value-style="{ color: '#f5222d', cursor: 'pointer' }" />
        </a-card>
      </a-col>
      <a-col :span="6">
        <a-card hoverable @click="onStatClick('09')" :class="{ 'stat-active': activeStatFilter === '09' }">
          <a-statistic title="待发布结果" :value="pendingPublishCount" :value-style="{ color: '#722ed1', cursor: 'pointer' }" />
        </a-card>
      </a-col>
    </a-row>

    <!-- Tabs -->
    <a-card style="margin-top: 16px">
      <a-tabs v-model:activeKey="activeTab">
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
            <a-form-item><a-button @click="resetFilters">重置</a-button></a-form-item>
          </a-form>

          <a-table :dataSource="sortedUnfinished" :columns="columns" rowKey="master_id" bordered size="middle">
            <template #bodyCell="{ column, record }">
              <template v-if="column.dataIndex === 'dept_display'">{{ record.parent_dept }}\{{ record.dept_name }}</template>
              <template v-if="column.dataIndex === 'tenure'">{{ getMonthsSinceHire(record.hire_date) }} 个月</template>
              <template v-if="column.dataIndex === 'probation_status'">
                <a-tag :color="STATUS_COLOR[record.probation_status]">{{ getDetailedStatusText(record) }}</a-tag>
              </template>
              <template v-if="column.key === 'action'">
                <a-space>
                  <a-button v-if="record.probation_status === '04'" type="primary" size="small" @click="handleTrigger(record.master_id)">开启转正流程</a-button>
                  <a-button v-if="record.probation_status === '04'" type="dashed" danger size="small" @click="handleHold(record.master_id)">暂不开启</a-button>
                  <a-button v-if="record.probation_status === '06' && !record.hrbp_eval_done" type="primary" size="small" @click="openEvalModal(record)">HRBP评价</a-button>
                  <a-button v-if="record.probation_status === '06' && record.hrbp_eval_done" type="text" size="small">已完成评价</a-button>
                  <a-button v-if="record.probation_status === '09'" type="primary" size="small" @click="openPublishModal(record)">发布结果</a-button>
                  <a-button type="link" size="small">查看档案</a-button>
                </a-space>
              </template>
            </template>
          </a-table>
        </a-tab-pane>

        <a-tab-pane key="finished" tab="已转正">
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

    <!-- HRBP评价 Modal -->
    <a-modal v-model:open="evalModalVisible" title="HRBP 试用期评价" width="700px" :footer="null">
      <div v-if="currentRecord">
        <a-descriptions bordered size="small" :column="2" style="margin-bottom: 16px">
          <a-descriptions-item label="员工">{{ currentRecord.emp_name }} ({{ currentRecord.emp_id }})</a-descriptions-item>
          <a-descriptions-item label="岗位">{{ currentRecord.position }}</a-descriptions-item>
          <a-descriptions-item label="部门">{{ currentRecord.parent_dept }}\{{ currentRecord.dept_name }}</a-descriptions-item>
          <a-descriptions-item label="入职时间">{{ currentRecord.hire_date }}</a-descriptions-item>
        </a-descriptions>

        <!-- 显示员工自评 -->
        <a-card size="small" title="员工自评" style="margin-bottom: 12px">
          <div v-if="currentSelfEval" style="white-space: pre-wrap; background: #fafafa; padding: 8px; border-radius: 4px;">{{ currentSelfEval.content }}</div>
          <a-empty v-else description="暂无" />
        </a-card>

        <!-- 上级评价（如有） -->
        <a-card size="small" title="上级评价" style="margin-bottom: 12px" v-if="currentManagerEval">
          <div style="white-space: pre-wrap; background: #f6ffed; padding: 8px; border-radius: 4px;">
            <strong>结论：{{ currentRecord.final_decision }}</strong><br/>
            {{ currentManagerEval.content }}
          </div>
        </a-card>

        <a-form layout="vertical">
          <a-form-item label="HRBP 评价意见" required>
            <a-textarea v-model:value="hrbpEvalContent" :rows="4" placeholder="请从 HRBP 角度对该员工试用期表现进行综合评价..." />
          </a-form-item>
          <div style="text-align: right">
            <a-space>
              <a-button @click="evalModalVisible = false">取消</a-button>
              <a-button type="primary" @click="handleHRBPEval" :disabled="!hrbpEvalContent.trim()">提交评价</a-button>
            </a-space>
          </div>
        </a-form>
      </div>
    </a-modal>

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
import { useProbationStore, ProbationMaster, STATUS_COLOR, getDetailedStatusText, getMonthsSinceHire } from '@/store/probation';
import { message } from 'ant-design-vue';

const store = useProbationStore();
const activeTab = ref('unfinished');
const searchText = ref('');
const filterDept = ref<string | undefined>(undefined);
const filterStatus = ref<string | undefined>(undefined);
const activeStatFilter = ref<string>('');

const unfinishedRecords = computed(() => store.records.filter(r => r.probation_status !== '10'));
const finishedList = computed(() => store.records.filter(r => r.probation_status === '10'));

const allUnfinishedCount = computed(() => unfinishedRecords.value.length);
const pendingTriggerCount = computed(() => store.records.filter(r => r.probation_status === '04').length);
const pendingHRBPEvalCount = computed(() => store.records.filter(r => r.probation_status === '06' && !r.hrbp_eval_done).length);
const pendingPublishCount = computed(() => store.records.filter(r => r.probation_status === '09').length);

const onStatClick = (status: string) => {
  activeStatFilter.value = status;
  activeTab.value = 'unfinished';
  if (status === 'hrbp_eval') filterStatus.value = '06';
  else filterStatus.value = status || undefined;
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

// HRBP sort: 04(待发起) & 06(待HRBP评价未完成) & 09(待发布) first -> rest by hire_date
const sortedUnfinished = computed(() => {
  return [...filteredUnfinished.value].sort((a, b) => {
    const pa = getHRBPPriority(a); const pb = getHRBPPriority(b);
    if (pa !== pb) return pa - pb;
    return new Date(a.hire_date).getTime() - new Date(b.hire_date).getTime();
  });
});

function getHRBPPriority(r: ProbationMaster): number {
  if (r.probation_status === '04') return 0;
  if (r.probation_status === '06' && !r.hrbp_eval_done) return 0;
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
  { title: '当前状态', dataIndex: 'probation_status', width: 150 },
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

// HRBP eval modal
const evalModalVisible = ref(false);
const currentRecord = ref<ProbationMaster | null>(null);
const hrbpEvalContent = ref('');

const currentSelfEval = computed(() => currentRecord.value?.evaluations.find(e => e.eval_type === 'self'));
const currentManagerEval = computed(() => currentRecord.value?.evaluations.find(e => e.eval_type === 'manager'));

const openEvalModal = (record: ProbationMaster) => {
  currentRecord.value = record; hrbpEvalContent.value = ''; evalModalVisible.value = true;
};

const handleHRBPEval = () => {
  if (currentRecord.value && hrbpEvalContent.value.trim()) {
    store.submitHRBPEval(currentRecord.value.master_id, hrbpEvalContent.value);
    message.success('HRBP评价提交成功！' + (currentRecord.value.manager_eval_done ? '双方评价完成，已进入审批流程。' : '等待上级完成评价后进入审批。'));
    evalModalVisible.value = false;
  }
};

// Publish result modal
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
</script>

<style scoped>
.stat-active { border-color: #1890ff; box-shadow: 0 0 0 2px rgba(24,144,255,.2); }
</style>
