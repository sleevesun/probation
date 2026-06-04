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
              <a-step :title="`上级评价(${stepCounts.s06_07})`" />
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
            <a-form-item><a-button @click="resetFilters">重置</a-button></a-form-item>
          </a-form>

          <a-table :dataSource="sortedUnfinished" :columns="columns" rowKey="master_id" bordered size="middle">
            <template #bodyCell="{ column, record }">
              <template v-if="column.dataIndex === 'dept_display'">{{ record.parent_dept }}\{{ record.dept_name }}</template>
              <template v-if="column.dataIndex === 'tenure'"><span :style="parseFloat(getMonthsSinceHire(record.hire_date)) > 6 ? 'color: #ff4d4f; font-weight: 500' : ''">{{ getMonthsSinceHire(record.hire_date) }} 个月</span></template>
              <template v-if="column.dataIndex === 'probation_status'">
                <a-tag :color="STATUS_COLOR[record.probation_status]">{{ getDetailedStatusText(record) }}</a-tag>
              </template>
              <template v-if="column.dataIndex === 'current_handler'">
                {{ getCurrentHandler(record) }}
              </template>
              <template v-if="column.key === 'action'">
                <a-space>
                  <a-button v-if="canTriggerProbation(record)" type="primary" size="small" @click="handleTrigger(record.master_id)">开启试用期评价</a-button>
                  <a-button v-if="['01','02','03','04'].includes(record.probation_status)" danger size="small" @click="handleHold(record.master_id)">不开启</a-button>
                  <a-button v-if="['02','03','04'].includes(record.probation_status)" size="small" @click="openStageEvalModal(record)">阶段性评价</a-button>
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
              <template v-if="column.dataIndex === 'tenure'"><span :style="parseFloat(getMonthsSinceHire(record.hire_date)) > 6 ? 'color: #ff4d4f; font-weight: 500' : ''">{{ getMonthsSinceHire(record.hire_date) }} 个月</span></template>
              <template v-if="column.dataIndex === 'final_decision'">
                <a-tag :color="isFailedDecision(record.final_decision) || record.final_decision === '离职' ? 'error' : 'success'">{{ formatDecisionLabel(record.final_decision) }}</a-tag>
              </template>
              <template v-if="column.key === 'detail'"><a-button type="link" size="small" @click="openDetailModal(record)">查看档案</a-button></template>
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
          type="warning" show-icon class="compact-overdue-alert"
          message="超期提醒：该员工试用期已超过 6 个月，如不发布，系统将在 3 个工作日后自动发布结果。"
        />

        <!-- 员工信息 -->
        <a-descriptions bordered size="small" :column="2" style="margin-bottom: 16px">
          <a-descriptions-item label="员工">{{ currentRecord.emp_name }} ({{ currentRecord.emp_id }})</a-descriptions-item>
          <a-descriptions-item label="岗位">{{ currentRecord.position }}</a-descriptions-item>
          <a-descriptions-item label="部门">{{ currentRecord.parent_dept }}\{{ currentRecord.dept_name }}</a-descriptions-item>
          <a-descriptions-item label="入职日期">{{ currentRecord.hire_date }}</a-descriptions-item>
          <a-descriptions-item label="直属上级">{{ currentRecord.manager_name }}</a-descriptions-item>
          <a-descriptions-item label="上级评价结果">
            <a-tag :color="isFailedDecision(currentRecord.final_decision) || currentRecord.final_decision === '离职' ? 'error' : 'success'">{{ formatDecisionLabel(currentRecord.final_decision) }}</a-tag>
          </a-descriptions-item>
        </a-descriptions>

        <!-- 试用期目标 -->
        <div style="font-weight: 600; margin-bottom: 8px">试用期目标</div>
        <div v-if="currentRecord.goals.length > 0" class="stacked-list" style="margin-bottom: 16px">
          <div v-for="(goal, index) in currentRecord.goals" :key="goal.goal_id" class="stacked-item">
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
        <a-empty v-else description="暂无目标" :image-style="{ height: '40px' }" style="margin-bottom: 16px" />

        <!-- 阶段性评价 -->
        <div style="font-weight: 600; margin-bottom: 8px">阶段性评价</div>
        <div v-if="(currentRecord.stage_evaluations || []).length > 0" class="stacked-list" style="margin-bottom: 16px">
          <div v-for="item in currentRecord.stage_evaluations || []" :key="item.stage_eval_id" class="stacked-item">
            <div class="stacked-meta-line">{{ item.evaluator_name }}-{{ item.evaluator_role }} <span>{{ item.create_time }}</span></div>
            <div class="stacked-content">{{ item.content }}</div>
          </div>
        </div>
        <a-empty v-else description="暂无阶段性评价记录" :image-style="{ height: '40px' }" style="margin-bottom: 16px" />

        <!-- 员工自评 -->
        <div style="font-weight: 600; margin-bottom: 8px">员工自评</div>
        <div v-if="currentSelfEval" class="eval-text-block" style="margin-bottom: 16px">{{ currentSelfEval.content }}</div>
        <a-empty v-else description="暂无员工自评" :image-style="{ height: '40px' }" style="margin-bottom: 16px" />

        <!-- 上级评价 -->
        <div style="font-weight: 600; margin-bottom: 8px">上级评价</div>
        <div class="eval-text-block" style="margin-bottom: 16px">
          <div v-if="currentManagerEval" class="manager-eval-block">
            <div class="manager-eval-block__result">
              <span>评价结果</span>
              <div>{{ formatDecisionLabel(currentRecord.final_decision) }}</div>
            </div>
            <div class="manager-eval-block__content">
              <span>评价内容</span>
              <div>{{ normalizeEvalContent(currentManagerEval.content, currentRecord.final_decision) }}</div>
            </div>
          </div>
          <a-empty v-else description="暂无上级评价" />
        </div>

        <a-form layout="vertical">
          <a-form-item>
            <a-checkbox v-model:checked="allowViewEval">允许员工查看上级评价内容</a-checkbox>
          </a-form-item>
          <div style="text-align: right">
            <a-space>
              <a-button @click="publishModalVisible = false">返回</a-button>
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
          <a-descriptions-item label="直属上级">{{ detailRecord.manager_name }}</a-descriptions-item>
          <a-descriptions-item label="上级评价结果">
            <a-tag :color="isFailedDecision(detailRecord.final_decision) || detailRecord.final_decision === '离职' ? 'error' : 'success'">{{ formatDecisionLabel(detailRecord.final_decision) }}</a-tag>
          </a-descriptions-item>
        </a-descriptions>

        <!-- 试用期目标 -->
        <div style="font-weight: 600; margin-bottom: 8px">试用期目标</div>
        <div v-if="detailRecord.goals.length > 0" class="stacked-list" style="margin-bottom: 16px">
          <div v-for="(goal, index) in detailRecord.goals" :key="goal.goal_id" class="stacked-item">
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
        <a-empty v-else description="暂无目标" :image-style="{ height: '40px' }" style="margin-bottom: 16px" />

        <!-- 阶段性评价 -->
        <div style="font-weight: 600; margin-bottom: 8px">阶段性评价</div>
        <div v-if="(detailRecord.stage_evaluations || []).length > 0" class="stacked-list" style="margin-bottom: 16px">
          <div v-for="item in detailRecord.stage_evaluations || []" :key="item.stage_eval_id" class="stacked-item">
            <div class="stacked-meta-line">{{ item.evaluator_name }}-{{ item.evaluator_role }} <span>{{ item.create_time }}</span></div>
            <div class="stacked-content">{{ item.content }}</div>
          </div>
        </div>
        <a-empty v-else description="暂无阶段性评价记录" :image-style="{ height: '40px' }" style="margin-bottom: 16px" />

        <!-- 员工自评 -->
        <div style="font-weight: 600; margin-bottom: 8px">员工自评</div>
        <div v-if="detailSelfEval" class="eval-text-block" style="margin-bottom: 16px">{{ detailSelfEval.content }}</div>
        <a-empty v-else description="暂无员工自评" :image-style="{ height: '40px' }" style="margin-bottom: 16px" />

        <!-- 上级评价 -->
        <div style="font-weight: 600; margin-bottom: 8px">上级评价</div>
        <div v-if="detailManagerEval" class="eval-text-block" style="margin-bottom: 16px">
          <div class="manager-eval-block">
            <div class="manager-eval-block__result">
              <span>评价结果</span>
              <div>{{ formatDecisionLabel(detailRecord.final_decision) }}</div>
            </div>
            <div class="manager-eval-block__content">
              <span>评价内容</span>
              <div>{{ normalizeEvalContent(detailManagerEval.content, detailRecord.final_decision) }}</div>
            </div>
          </div>
        </div>
        <a-empty v-else description="暂无上级评价" :image-style="{ height: '40px' }" style="margin-bottom: 16px" />

        <!-- 审批记录 -->
        <div v-if="['08', '09', '10'].includes(detailRecord.probation_status)" class="approval-records-section">
          <div class="approval-records-title">审批记录</div>
          <div v-if="detailRecord.approval_logs && detailRecord.approval_logs.length > 0">
            <div v-for="log in detailRecord.approval_logs" :key="log.log_id" class="approval-record-item">
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

    <!-- 审批单预览 Modal -->
    <a-modal v-model:open="approvalPreviewVisible" title="转正审批单预览" width="750px" :footer="null">
      <div v-if="approvalPreviewRecord">
        <a-descriptions bordered size="small" :column="2" style="margin-bottom: 16px">
          <a-descriptions-item label="员工">{{ approvalPreviewRecord.emp_name }} ({{ approvalPreviewRecord.emp_id }})</a-descriptions-item>
          <a-descriptions-item label="岗位">{{ approvalPreviewRecord.position }}</a-descriptions-item>
          <a-descriptions-item label="部门">{{ approvalPreviewRecord.parent_dept }}\{{ approvalPreviewRecord.dept_name }}</a-descriptions-item>
          <a-descriptions-item label="入职日期">{{ approvalPreviewRecord.hire_date }}</a-descriptions-item>
          <a-descriptions-item label="直属上级">{{ approvalPreviewRecord.manager_name }}</a-descriptions-item>
          <a-descriptions-item label="上级评价结果">
            <a-tag :color="isFailedDecision(approvalPreviewRecord.final_decision) ? 'error' : 'success'">{{ formatDecisionLabel(approvalPreviewRecord.final_decision) }}</a-tag>
          </a-descriptions-item>
        </a-descriptions>

        <!-- 试用期目标 -->
        <div class="approval-detail-section">
          <div class="approval-detail-section__title">试用期目标</div>
          <div v-if="approvalPreviewRecord.goals.length > 0">
            <div class="approval-detail-item" v-for="(goal, idx) in approvalPreviewRecord.goals" :key="goal.goal_id">
              <div class="approval-detail-item__title">{{ idx + 1 }}. {{ goal.content }}</div>
              <div class="approval-detail-item__field">预期结果：{{ goal.measure }}</div>
              <div class="approval-detail-item__field">目标回顾：{{ goal.goal_review || '暂无目标回顾' }}</div>
            </div>
          </div>
          <a-empty v-else description="暂无目标" :image-style="{ height: '40px' }" />
        </div>

        <!-- 阶段性评价 -->
        <div class="approval-detail-section">
          <div class="approval-detail-section__title">阶段性评价</div>
          <div v-if="(approvalPreviewRecord.stage_evaluations || []).length > 0">
            <div class="approval-detail-item" v-for="stageEval in approvalPreviewRecord.stage_evaluations || []" :key="stageEval.stage_eval_id">
              <div class="approval-detail-item__title">{{ stageEval.evaluator_name }}-{{ stageEval.evaluator_role }} {{ stageEval.create_time }}</div>
              <div class="approval-detail-item__content">{{ stageEval.content }}</div>
            </div>
          </div>
          <a-empty v-else description="暂无阶段性评价记录" :image-style="{ height: '40px' }" />
        </div>

        <!-- 员工自评 -->
        <div class="approval-detail-section">
          <div class="approval-detail-section__title">员工自评</div>
          <div v-if="selfEval" class="approval-detail-section__content">{{ selfEval.content }}</div>
          <a-empty v-else description="暂无自评" :image-style="{ height: '40px' }" />
        </div>

        <!-- 上级评价 -->
        <div class="approval-detail-section">
          <div class="approval-detail-section__title">上级评价</div>
          <div v-if="managerEval" class="approval-detail-section__content">
            <div><strong>评价结果：</strong>{{ managerEvalResultText }}</div>
            <div style="margin-top: 8px;">{{ managerEvalContentText }}</div>
          </div>
          <a-empty v-else description="暂无上级评价" :image-style="{ height: '40px' }" />
        </div>

        <a-form layout="vertical">
          <a-form-item label="备注说明">
            <a-textarea v-model:value="approvalRemark" :rows="3" placeholder="可填写转正说明或备注信息" />
          </a-form-item>
          <div style="text-align: right">
            <a-space>
              <a-button @click="approvalPreviewVisible = false">取消</a-button>
              <a-button type="primary" @click="submitApproval">发起转正流程</a-button>
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
          <a-descriptions-item label="直属上级">{{ stageEvalRecord.manager_name }}</a-descriptions-item>
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
import { useProbationStore, ProbationMaster, STATUS_COLOR, getDetailedStatusText, getMonthsSinceHire, getCurrentHandler, canTriggerProbation, formatDecisionLabel, isFailedDecision } from '@/store/probation';
import { message, Modal, TreeSelect } from 'ant-design-vue';

const store = useProbationStore();
const activeTab = ref('unfinished');
const searchText = ref('');
const filterDept = ref<string[]>([]);
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
    s02_03: formatCount(records.filter(r => ['02', '03', '04'].includes(r.probation_status)).length),
    s05: formatCount(records.filter(r => r.probation_status === '05').length),
    s06_07: formatCount(records.filter(r => ['06', '07'].includes(r.probation_status)).length),
    s08: formatCount(records.filter(r => r.probation_status === '08').length),
    s09: formatCount(records.filter(r => r.probation_status === '09').length)
  };
});

const onStepChange = (current: number) => {
  currentStepIndex.value = current;
  const stepMap = ['all', '01', '02_03', '05', '06_07', '08', '09'];
  const filterVal = stepMap[current];

  activeTab.value = 'unfinished';
  activeStepFilter.value = filterVal;
  onlyMyTodo.value = false;
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
    list = list.filter(r => ['04', '07', '09'].includes(r.probation_status));
  }

  // 1. 流程轴过滤
  if (activeStepFilter.value !== 'all') {
    if (activeStepFilter.value === '02_03') {
      list = list.filter(r => ['02', '03', '04'].includes(r.probation_status));
    } else if (activeStepFilter.value === '06_07') {
      list = list.filter(r => ['06', '07'].includes(r.probation_status));
    } else {
      list = list.filter(r => r.probation_status === activeStepFilter.value);
    }
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
  { title: '直属上级', dataIndex: 'manager_name', width: 80 },
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
  { title: '评价结果', dataIndex: 'final_decision', width: 160 },
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

// Approval preview
const approvalPreviewVisible = ref(false);
const approvalPreviewRecord = ref<ProbationMaster | null>(null);
const approvalRemark = ref('');
const selfEval = computed(() => approvalPreviewRecord.value?.evaluations.find(e => e.eval_type === 'self'));
const managerEval = computed(() => approvalPreviewRecord.value?.evaluations.find(e => e.eval_type === 'manager'));
const managerEvalResultText = computed(() => formatDecisionLabel(approvalPreviewRecord.value?.final_decision));
const managerEvalContentText = computed(() => normalizeEvalContent(managerEval.value?.content, approvalPreviewRecord.value?.final_decision));

const normalizeEvalContent = (content?: string, decision?: string) => {
  if (!content) return '暂无';
  const label = formatDecisionLabel(decision);
  const normalized = content.trim();
  if (label !== '-' && normalized.startsWith(label)) {
    return normalized.slice(label.length).replace(/^\s*[-－—]\s*/, '') || normalized;
  }
  return normalized.replace(/^(超出预期|符合预期|不符合转正条件|不通过)\s*[-－—]\s*/, '');
};

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
    width: 560,
    class: 'terminate-confirm-modal',
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

.compact-overdue-alert {
  margin-bottom: 12px;
}

.compact-overdue-alert :deep(.ant-alert-message) {
  font-size: 13px;
  line-height: 22px;
}

.compact-overdue-alert :deep(.ant-alert-content) {
  min-height: 22px;
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

.manager-eval-block {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.manager-eval-block__result,
.manager-eval-block__content {
  display: grid;
  grid-template-columns: 88px 1fr;
  gap: 12px;
  align-items: start;
}

.manager-eval-block__result > span,
.manager-eval-block__content > span {
  color: #667085;
  font-weight: 600;
}

.manager-eval-block__result > div,
.manager-eval-block__content > div {
  white-space: pre-wrap;
  line-height: 1.7;
}

:global(.terminate-confirm-modal .ant-modal-content) {
  min-width: 560px;
}

:global(.terminate-confirm-modal .ant-modal-confirm-content) {
  white-space: nowrap;
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

/* 审批预览明细样式 */
.approval-detail-item {
  padding: 12px 0;
  border-bottom: 1px solid #f0f1f3;
}
.approval-detail-item:last-child {
  border-bottom: none;
}
.approval-detail-item__title {
  font-size: 14px;
  font-weight: 500;
  color: #1f2329;
  margin-bottom: 4px;
}
.approval-detail-item__field {
  font-size: 13px;
  color: #646a73;
  margin-top: 4px;
}
.approval-detail-item__content {
  font-size: 14px;
  color: #1f2329;
  line-height: 1.6;
  white-space: pre-wrap;
}
.approval-detail-section {
  margin-bottom: 16px;
}
.approval-detail-section__title {
  font-size: 14px;
  font-weight: 600;
  color: #1f2329;
  margin-bottom: 8px;
}
.approval-detail-section__content {
  font-size: 14px;
  color: #333;
  line-height: 1.6;
  background: #f8fafc;
  padding: 12px 16px;
  border-radius: 8px;
  white-space: pre-wrap;
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
