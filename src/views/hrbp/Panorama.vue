<template>
  <div class="workbench-page">
    <a-page-header title="试用期管理" />

    <!-- Tabs -->
    <a-card class="workbench-card">
      <a-tabs v-model:activeKey="activeTab" class="workbench-tabs">
        <a-tab-pane key="unfinished" tab="未转正">
          <!-- 流程轴过滤 -->
          <div style="margin-bottom: 12px; padding: 6px 12px; background: #fafafa; border-radius: 8px;">
            <a-steps :current="currentStepIndex" @change="onStepChange" type="navigation" size="small" class="custom-steps">
              <a-step :title="`全部(${stepCounts.all})`" />
              <a-step :title="`待设定目标(${stepCounts.s01})`" />
              <a-step :title="`已设定目标(${stepCounts.s02_03})`" />
              <a-step :title="`待员工自评(${stepCounts.s05})`" />
              <a-step :title="`待上级评价(${stepCounts.s06})`" />
              <a-step :title="`待发起审批(${stepCounts.s07})`" />
              <a-step :title="`审批中(${stepCounts.s08})`" />
              <a-step :title="`待发布(${stepCounts.s09})`" />
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
                  <a-button v-if="record.probation_status === '04'" type="primary" size="small" @click="handleTrigger(record.master_id)">开启试用期评价</a-button>
                  <a-button v-if="['01','02','03','04'].includes(record.probation_status)" danger size="small" @click="handleHold(record.master_id)">不开启</a-button>
                  <a-button v-if="['01','02','03','04'].includes(record.probation_status)" size="small" @click="openStageEvalModal(record)">阶段性评价</a-button>
                  <a-button v-if="['05','06'].includes(record.probation_status)" danger size="small" @click="handleTerminate(record.master_id)">终止转正</a-button>
                  <a-button v-if="record.probation_status === '07'" type="primary" size="small" @click="openApprovalPreview(record)">发起转正审批流程</a-button>
                  <a-button v-if="record.probation_status === '07'" danger size="small" @click="handleTerminate(record.master_id)">终止转正</a-button>
                  <a-button v-if="record.probation_status === '09'" type="primary" size="small" @click="confirmPublish(record)">发布结果</a-button>
                </a-space>
              </template>
              <template v-if="column.key === 'detail'">
                <a-button type="link" size="small" @click="openDetailModal(record)">查看详情</a-button>
              </template>
            </template>
          </a-table>
        </a-tab-pane>

        <a-tab-pane key="finished" tab="已结束">
          <a-table :dataSource="finishedList" :columns="finishedColumns" rowKey="master_id" bordered size="middle">
            <template #bodyCell="{ column, record }">
              <template v-if="column.dataIndex === 'dept_display'">{{ record.parent_dept }}\{{ record.dept_name }}</template>
              <template v-if="column.dataIndex === 'tenure'">{{ getMonthsSinceHire(record.hire_date) }} 个月</template>
              <template v-if="column.dataIndex === 'final_decision'">
                <a-tag :color="['不符合转正条件', '离职'].includes(record.final_decision) ? 'error' : 'success'">{{ record.final_decision || '-' }}</a-tag>
              </template>
              <template v-if="column.key === 'detail'"><a-button type="link" size="small">查看档案</a-button></template>
            </template>
          </a-table>
        </a-tab-pane>
      </a-tabs>
    </a-card>

    <!-- 发布结果 Modal -->
    <a-modal v-model:open="publishModalVisible" title="发布转正结果" width="800px" :footer="null">
      <div v-if="currentRecord">
        <!-- 超期提醒（置顶） -->
        <a-alert
          v-if="isOverSixMonths"
          type="warning" show-icon style="margin-bottom: 16px"
          message="超期提醒"
          description="该员工试用期已超过 6 个月，如不发布，系统将在 3 个工作日后自动发布结果。"
        />

        <!-- 员工信息 -->
        <a-descriptions bordered size="small" :column="2" style="margin-bottom: 16px">
          <a-descriptions-item label="员工">{{ currentRecord.emp_name }} ({{ currentRecord.emp_id }})</a-descriptions-item>
          <a-descriptions-item label="岗位">{{ currentRecord.position }}</a-descriptions-item>
          <a-descriptions-item label="部门">{{ currentRecord.parent_dept }}\{{ currentRecord.dept_name }}</a-descriptions-item>
          <a-descriptions-item label="入职日期">{{ currentRecord.hire_date }}</a-descriptions-item>
          <a-descriptions-item label="直属主管">{{ currentRecord.manager_name }}</a-descriptions-item>
          <a-descriptions-item label="转正结论">
            <a-tag :color="['不符合转正条件', '离职'].includes(currentRecord.final_decision as string) ? 'error' : 'success'">{{ currentRecord.final_decision || '-' }}</a-tag>
          </a-descriptions-item>
        </a-descriptions>

        <!-- 试用期目标 -->
        <div style="font-weight: 600; margin-bottom: 8px">试用期目标</div>
        <a-table v-if="currentRecord.goals.length > 0" :dataSource="currentRecord.goals" :columns="goalColumns" :pagination="false" rowKey="goal_id" size="small" bordered style="margin-bottom: 16px" />
        <a-empty v-else description="暂无目标" :image-style="{ height: '40px' }" style="margin-bottom: 16px" />

        <!-- 阶段性评价 -->
        <div style="font-weight: 600; margin-bottom: 8px">阶段性评价</div>
        <a-table v-if="(currentRecord.stage_evaluations || []).length > 0" :dataSource="currentRecord.stage_evaluations || []" :columns="stageEvalColumns" :pagination="false" rowKey="stage_eval_id" size="small" bordered style="margin-bottom: 16px" />
        <a-empty v-else description="暂无阶段性评价记录" :image-style="{ height: '40px' }" style="margin-bottom: 16px" />

        <!-- 员工自评 -->
        <div style="font-weight: 600; margin-bottom: 8px">员工自评</div>
        <a-card v-if="currentSelfEval" size="small" style="margin-bottom: 16px; background: #f6ffed">
          <div style="white-space: pre-wrap;">{{ currentSelfEval.content }}</div>
        </a-card>
        <a-empty v-else description="暂无员工自评" :image-style="{ height: '40px' }" style="margin-bottom: 16px" />

        <!-- 上级评价 -->
        <div style="font-weight: 600; margin-bottom: 8px">上级评价</div>
        <a-card size="small" style="margin-bottom: 16px; background: #e6f7ff">
          <div v-if="currentManagerEval" style="white-space: pre-wrap;">{{ currentManagerEval.content }}</div>
          <a-empty v-else description="暂无上级评价" />
        </a-card>

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

    <!-- 查看详情 Modal -->
    <a-modal v-model:open="detailModalVisible" title="员工转正详情" width="800px" :footer="null">
      <div v-if="detailRecord">
        <!-- 员工信息 -->
        <a-descriptions bordered size="small" :column="2" style="margin-bottom: 16px">
          <a-descriptions-item label="员工">{{ detailRecord.emp_name }} ({{ detailRecord.emp_id }})</a-descriptions-item>
          <a-descriptions-item label="岗位">{{ detailRecord.position }}</a-descriptions-item>
          <a-descriptions-item label="部门">{{ detailRecord.parent_dept }}\{{ detailRecord.dept_name }}</a-descriptions-item>
          <a-descriptions-item label="入职日期">{{ detailRecord.hire_date }}</a-descriptions-item>
          <a-descriptions-item label="直属主管">{{ detailRecord.manager_name }}</a-descriptions-item>
          <a-descriptions-item label="当前状态">{{ getDetailedStatusText(detailRecord) }}</a-descriptions-item>
        </a-descriptions>

        <!-- 试用期目标 -->
        <div style="font-weight: 600; margin-bottom: 8px">试用期目标</div>
        <a-table v-if="detailRecord.goals.length > 0" :dataSource="detailRecord.goals" :columns="goalColumns" :pagination="false" rowKey="goal_id" size="small" bordered style="margin-bottom: 16px" />
        <a-empty v-else description="暂无目标" :image-style="{ height: '40px' }" style="margin-bottom: 16px" />

        <!-- 阶段性评价 -->
        <div style="font-weight: 600; margin-bottom: 8px">阶段性评价</div>
        <a-table v-if="(detailRecord.stage_evaluations || []).length > 0" :dataSource="detailRecord.stage_evaluations || []" :columns="stageEvalColumns" :pagination="false" rowKey="stage_eval_id" size="small" bordered style="margin-bottom: 16px" />
        <a-empty v-else description="暂无阶段性评价记录" :image-style="{ height: '40px' }" style="margin-bottom: 16px" />

        <!-- 员工自评 -->
        <div style="font-weight: 600; margin-bottom: 8px">员工自评与总结</div>
        <a-card v-if="detailSelfEval" size="small" style="margin-bottom: 16px; background: #f6ffed">
          <div style="white-space: pre-wrap;">{{ detailSelfEval.content }}</div>
        </a-card>
        <a-empty v-else description="暂无员工自评" :image-style="{ height: '40px' }" style="margin-bottom: 16px" />

        <!-- 上级评价 -->
        <div style="font-weight: 600; margin-bottom: 8px">上级评价</div>
        <a-card v-if="detailManagerEval" size="small" style="margin-bottom: 16px; background: #e6f7ff">
          <div style="white-space: pre-wrap;">{{ detailManagerEval.content }}</div>
        </a-card>
        <a-empty v-else description="暂无上级评价" :image-style="{ height: '40px' }" style="margin-bottom: 16px" />
      </div>
    </a-modal>

    <!-- 审批单预览 Modal -->
    <a-modal v-model:open="approvalPreviewVisible" title="转正审批单预览" width="750px" :footer="null">
      <div v-if="approvalPreviewRecord">
        <a-descriptions bordered size="small" :column="2" style="margin-bottom: 16px">
          <a-descriptions-item label="员工">{{ approvalPreviewRecord.emp_name }} ({{ approvalPreviewRecord.emp_id }})</a-descriptions-item>
          <a-descriptions-item label="岗位">{{ approvalPreviewRecord.position }}</a-descriptions-item>
          <a-descriptions-item label="部门">{{ approvalPreviewRecord.parent_dept }}\{{ approvalPreviewRecord.dept_name }}</a-descriptions-item>
          <a-descriptions-item label="入职日期">{{ approvalPreviewRecord.hire_date }}</a-descriptions-item>
          <a-descriptions-item label="直属主管">{{ approvalPreviewRecord.manager_name }}</a-descriptions-item>
          <a-descriptions-item label="转正结论">
            <a-tag :color="approvalPreviewRecord.final_decision === '不符合转正条件' ? 'error' : 'success'">{{ approvalPreviewRecord.final_decision || '-' }}</a-tag>
          </a-descriptions-item>
        </a-descriptions>

        <!-- 目标信息 -->
        <a-card size="small" title="目标信息" style="margin-bottom: 12px">
          <a-table :dataSource="approvalPreviewRecord.goals" :columns="goalColumns" rowKey="goal_id" size="small" :pagination="false" bordered />
        </a-card>

        <!-- 员工自评 -->
        <a-card size="small" title="员工自评" style="margin-bottom: 12px; background: #f6ffed">
          <div v-if="selfEval" style="white-space: pre-wrap;">{{ selfEval.content }}</div>
          <a-empty v-else description="暂无自评" />
        </a-card>

        <!-- 上级评价 -->
        <a-card size="small" title="上级评价" style="margin-bottom: 12px; background: #e6f7ff">
          <div v-if="managerEval" style="white-space: pre-wrap;">{{ managerEval.content }}</div>
          <a-empty v-else description="暂无上级评价" />
        </a-card>

        <!-- HRBP 发起信息 -->
        <a-card size="small" title="HRBP 发起信息" style="margin-bottom: 16px">
          <div style="white-space: pre-wrap;">发起人：{{ approvalPreviewRecord.hrbp_name }}</div>
        </a-card>

        <a-form layout="vertical">
          <a-form-item label="转正说明 / 备注（非必填）">
            <a-textarea v-model:value="approvalRemark" :rows="3" placeholder="可填写转正说明或备注信息" />
          </a-form-item>
          <div style="text-align: right">
            <a-space>
              <a-button @click="approvalPreviewVisible = false">取消</a-button>
              <a-button type="primary" @click="submitApproval">提交审批</a-button>
            </a-space>
          </div>
        </a-form>
      </div>
    </a-modal>

    <!-- 阶段性评价弹窗 -->
    <a-modal v-model:open="stageEvalModalVisible" title="填写阶段性评价" width="700px" :footer="null">
      <div v-if="stageEvalRecord">
        <a-descriptions bordered size="small" :column="2" style="margin-bottom: 16px">
          <a-descriptions-item label="员工">{{ stageEvalRecord.emp_name }} ({{ stageEvalRecord.emp_id }})</a-descriptions-item>
          <a-descriptions-item label="岗位">{{ stageEvalRecord.position }}</a-descriptions-item>
          <a-descriptions-item label="部门">{{ stageEvalRecord.parent_dept }}\{{ stageEvalRecord.dept_name }}</a-descriptions-item>
          <a-descriptions-item label="直属主管">{{ stageEvalRecord.manager_name }}</a-descriptions-item>
          <a-descriptions-item label="入职日期">{{ stageEvalRecord.hire_date }}</a-descriptions-item>
          <a-descriptions-item label="当前状态">{{ getDetailedStatusText(stageEvalRecord) }}</a-descriptions-item>
        </a-descriptions>

        <div style="font-weight: 600; margin-bottom: 8px">目标信息</div>
        <a-table v-if="stageEvalRecord.goals.length > 0" :dataSource="stageEvalRecord.goals" :columns="stageGoalColumns" :pagination="false" rowKey="goal_id" size="small" bordered style="margin-bottom: 16px" />
        <a-alert v-else type="info" message="暂未完成试用期目标制定" style="margin-bottom: 16px" />

        <div style="font-weight: 600; margin-bottom: 8px">历史阶段性评价</div>
        <a-table v-if="(stageEvalRecord.stage_evaluations || []).length > 0" :dataSource="stageEvalRecord.stage_evaluations || []" :columns="stageEvalHistoryColumns" :pagination="false" rowKey="stage_eval_id" size="small" bordered style="margin-bottom: 16px" />
        <a-empty v-else description="暂无阶段性评价记录" :image-style="{ height: '40px' }" style="margin-bottom: 16px" />

        <a-form layout="vertical">
          <a-form-item label="评价内容" required>
            <a-textarea v-model:value="stageEvalContent" :rows="4" placeholder="请输入阶段性评价内容" />
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
import { useProbationStore, ProbationMaster, STATUS_COLOR, getDetailedStatusText, getMonthsSinceHire, getCurrentHandler } from '@/store/probation';
import { message, Modal } from 'ant-design-vue';

const store = useProbationStore();
const activeTab = ref('unfinished');
const searchText = ref('');
const filterDept = ref<string | undefined>(undefined);
const activeTodoFilter = ref<string>('');
const onlyMyTodo = ref(false);

const currentStepIndex = ref<number>(0);
const activeStepFilter = ref<string>('all');

// 未转正：排除已结束状态(10/88/99)
const unfinishedRecords = computed(() => store.records.filter(r => !['10', '88', '99'].includes(r.probation_status)));
// 已结束：结果已发布(10) + 未转正离职(88) + 暂不发起/终止(99)
const finishedList = computed(() => store.records.filter(r => ['10', '88', '99'].includes(r.probation_status)));

const formatCount = (count: number) => count > 0 ? count : '-';

const stepCounts = computed(() => {
  const records = store.records;
  return {
    all: formatCount(unfinishedRecords.value.length),
    s01: formatCount(records.filter(r => r.probation_status === '01').length),
    s02_03: formatCount(records.filter(r => ['02', '03'].includes(r.probation_status)).length),
    s05: formatCount(records.filter(r => r.probation_status === '05').length),
    s06: formatCount(records.filter(r => r.probation_status === '06').length),
    s07: formatCount(records.filter(r => r.probation_status === '07').length),
    s08: formatCount(records.filter(r => r.probation_status === '08').length),
    s09: formatCount(records.filter(r => r.probation_status === '09').length)
  };
});

const onStepChange = (current: number) => {
  currentStepIndex.value = current;
  const stepMap = ['all', '01', '02_03', '05', '06', '07', '08', '09'];
  const filterVal = stepMap[current];

  activeTab.value = 'unfinished';
  activeStepFilter.value = filterVal;
  onlyMyTodo.value = false;
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
    list = list.filter(r => ['04', '07', '09'].includes(r.probation_status));
  }

  // 1. 流程轴过滤
  if (activeStepFilter.value !== 'all') {
    if (activeStepFilter.value === '02_03') {
      list = list.filter(r => ['02', '03'].includes(r.probation_status));
    } else {
      list = list.filter(r => r.probation_status === activeStepFilter.value);
    }
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
  { title: '操作', key: 'action', width: 200 },
  { title: '详情', key: 'detail', width: 80 }
];

const finishedColumns = [
  { title: '姓名', dataIndex: 'emp_name', width: 90 },
  { title: '工号', dataIndex: 'emp_id', width: 80 },
  { title: '岗位', dataIndex: 'position', width: 130 },
  { title: '直属部门', dataIndex: 'dept_display', width: 160 },
  { title: '入职日期', dataIndex: 'hire_date', width: 110 },
  { title: '结论', dataIndex: 'final_decision', width: 130 },
  { title: '详情', key: 'detail', width: 80 }
];

// Publish result modal
const currentRecord = ref<ProbationMaster | null>(null);
const currentManagerEval = computed(() => currentRecord.value?.evaluations.find(e => e.eval_type === 'manager'));
const currentSelfEval = computed(() => currentRecord.value?.evaluations.find(e => e.eval_type === 'self'));
const publishModalVisible = ref(false);
const allowViewEval = ref(false);

// Detail modal
const detailModalVisible = ref(false);
const detailRecord = ref<ProbationMaster | null>(null);
const detailManagerEval = computed(() => detailRecord.value?.evaluations.find(e => e.eval_type === 'manager'));
const detailSelfEval = computed(() => detailRecord.value?.evaluations.find(e => e.eval_type === 'self'));

const stageEvalColumns = [
  { title: '填写人', dataIndex: 'evaluator_name', width: 80 },
  { title: '角色', dataIndex: 'evaluator_role', width: 80 },
  { title: '评价内容', dataIndex: 'content' },
  { title: '时间', dataIndex: 'create_time', width: 150 }
];

// Approval preview
const approvalPreviewVisible = ref(false);
const approvalPreviewRecord = ref<ProbationMaster | null>(null);
const approvalRemark = ref('');
const selfEval = computed(() => approvalPreviewRecord.value?.evaluations.find(e => e.eval_type === 'self'));
const managerEval = computed(() => approvalPreviewRecord.value?.evaluations.find(e => e.eval_type === 'manager'));

const goalColumns = [
  { title: '维度', dataIndex: 'dimension', width: 80 },
  { title: '内容', dataIndex: 'content' },
  { title: '衡量方式/预期结果', dataIndex: 'measure', width: 200 }
];

const isOverSixMonths = computed(() => {
  if (!currentRecord.value) return false;
  const months = parseFloat(getMonthsSinceHire(currentRecord.value.hire_date));
  return months >= 6;
});

const handlePublish = () => {
  if (currentRecord.value) {
    Modal.confirm({
      title: '确认发布结果',
      content: '确认后将发布该员工的转正结果，发布后员工可查看。是否继续？',
      onOk: () => {
        store.publishResult(currentRecord.value!.master_id, allowViewEval.value);
        message.success('结果已发布！' + (allowViewEval.value ? '员工可查看上级评价。' : '员工不可查看上级评价。'));
        publishModalVisible.value = false;
      }
    });
  }
};

const handleTrigger = (id: string) => {
  Modal.confirm({
    title: '确认开启试用期评价',
    content: '确认后将通知该员工开始填写试用期自评。',
    onOk: () => { store.triggerProbation(id); message.success('已开启试用期评价'); }
  });
};

const handleHold = (id: string) => {
  Modal.confirm({
    title: '确认不开启',
    content: '该员工将进入「不开启/终止」状态，不再继续转正流程。',
    okType: 'danger',
    onOk: () => { store.holdProbation(id); message.warning('已不开启'); }
  });
};

const handleTerminate = (id: string) => {
  Modal.confirm({
    title: '确认终止转正',
    content: '该员工将进入「不开启/终止」状态，不再继续转正流程。',
    okText: '确认终止',
    okType: 'danger',
    cancelText: '取消',
    onOk: () => { store.holdProbation(id); message.warning('已终止转正'); }
  });
};

const openApprovalPreview = (record: ProbationMaster) => {
  approvalPreviewRecord.value = record;
  approvalRemark.value = '';
  approvalPreviewVisible.value = true;
};

const submitApproval = () => {
  if (approvalPreviewRecord.value) {
    store.triggerApproval(approvalPreviewRecord.value.master_id);
    message.success('已发起转正审批流程');
    approvalPreviewVisible.value = false;
  }
};

const confirmPublish = (record: ProbationMaster) => {
  currentRecord.value = record;
  allowViewEval.value = false;
  publishModalVisible.value = true;
};

const openDetailModal = (record: ProbationMaster) => {
  detailRecord.value = record;
  detailModalVisible.value = true;
};

// 阶段性评价弹窗
const stageEvalModalVisible = ref(false);
const stageEvalRecord = ref<ProbationMaster | null>(null);
const stageEvalContent = ref('');

const stageGoalColumns = [
  { title: '维度', dataIndex: 'dimension', width: 80 },
  { title: '目标内容', dataIndex: 'content' },
  { title: '衡量方式/预期结果', dataIndex: 'measure', width: 200 }
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
  store.addStageEvaluation(stageEvalRecord.value.master_id, '刘建国', 'HRBP', stageEvalContent.value);
  message.success('阶段性评价已提交');
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
</style>
