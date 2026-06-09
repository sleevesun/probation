<template>
  <div class="approval-page" :class="{ 'approval-page--mobile': isMobile }">
    <PrdAnnotation id="17">
      <a-page-header title="试用期转正审批" :sub-title="isMobile ? '' : '您的待办与已办审批单据'">
        <template #extra>
          <a-space>
            <span style="font-size: 13px; color: #666;">{{ isMobile ? '移动端视图' : 'PC端视图' }}</span>
            <a-switch v-model:checked="isMobile" checked-children="移动" un-checked-children="PC" />
          </a-space>
        </template>
      </a-page-header>

      <!-- ====== PC 端：表格列表 ====== -->
      <template v-if="!isMobile">
        <a-tabs v-model:activeKey="activeTab">
          <a-tab-pane key="todo" tab="待我审批">
            <a-table :dataSource="todoList" :columns="columns" rowKey="master_id" bordered>
              <template #bodyCell="{ column, record }">
                <template v-if="column.dataIndex === 'dept_display'">{{ record.parent_dept }}\{{ record.dept_name }}</template>
                <template v-if="column.key === 'action'">
                  <a-button type="primary" size="small" @click="openModal(record)">审批</a-button>
                </template>
              </template>
            </a-table>
          </a-tab-pane>

          <a-tab-pane key="done" tab="我已审批">
            <a-table :dataSource="doneList" :columns="doneColumns" rowKey="master_id" bordered>
              <template #bodyCell="{ column, record }">
                <template v-if="column.dataIndex === 'dept_display'">{{ record.parent_dept }}\{{ record.dept_name }}</template>
                <template v-if="column.dataIndex === 'final_decision'">
                  <a-tag :color="isFailedDecision(record.final_decision) || record.final_decision === '离职' ? 'error' : 'success'">{{ formatDecisionLabel(record.final_decision) }}</a-tag>
                </template>
                <template v-if="column.key === 'action'">
                  <a-button size="small" @click="openModal(record)">审批</a-button>
                </template>
              </template>
            </a-table>
          </a-tab-pane>
        </a-tabs>
      </template>

      <!-- ====== 移动端：卡片列表 ====== -->
      <template v-else>
        <div class="mobile-tabs">
          <div class="mobile-tab" :class="{ 'mobile-tab--active': activeTab === 'todo' }" @click="activeTab = 'todo'">
            待我审批 <span v-if="todoList.length" class="mobile-tab__badge">{{ todoList.length }}</span>
          </div>
          <div class="mobile-tab" :class="{ 'mobile-tab--active': activeTab === 'done' }" @click="activeTab = 'done'">
            我已审批 <span v-if="doneList.length" class="mobile-tab__badge">{{ doneList.length }}</span>
          </div>
        </div>

        <div class="mobile-list">
          <!-- 待办卡片 -->
          <template v-if="activeTab === 'todo'">
            <div v-if="!todoList.length" class="mobile-empty">暂无待审批单据</div>
            <div v-for="record in todoList" :key="record.master_id" class="mobile-card" @click="openModal(record)">
              <div class="mobile-card__header">
                <span class="mobile-card__title">{{ record.emp_name }} 的试用期转正审批流程</span>
              </div>
              <div class="mobile-card__body">
                <div class="mobile-card__meta">
                  <span>员工：{{ record.emp_name }}（{{ record.emp_id }}）</span>
                  <span>部门：{{ record.parent_dept }}\{{ record.dept_name }}</span>
                  <span>发起人：{{ record.hrbp_name }}</span>
                </div>
              </div>
              <div class="mobile-card__footer">
                <a-button type="primary" block @click.stop="openModal(record)">审批</a-button>
              </div>
            </div>
          </template>

          <!-- 已办卡片 -->
          <template v-if="activeTab === 'done'">
            <div v-if="!doneList.length" class="mobile-empty">暂无已审批单据</div>
            <div v-for="record in doneList" :key="record.master_id" class="mobile-card" @click="openModal(record)">
              <div class="mobile-card__header">
                <span class="mobile-card__title">{{ record.emp_name }} 的试用期转正审批流程</span>
                <a-tag :color="isFailedDecision(record.final_decision) ? 'error' : 'success'" size="small">{{ formatDecisionLabel(record.final_decision) }}</a-tag>
              </div>
              <div class="mobile-card__body">
                <div class="mobile-card__meta">
                  <span>员工：{{ record.emp_name }}（{{ record.emp_id }}）</span>
                  <span>部门：{{ record.parent_dept }}\{{ record.dept_name }}</span>
                  <span>发起人：{{ record.hrbp_name }}</span>
                </div>
              </div>
              <div class="mobile-card__footer">
                <a-button block @click.stop="openModal(record)">审批</a-button>
              </div>
            </div>
          </template>
        </div>
      </template>
    </PrdAnnotation>

    <!-- ====== PC 端：弹窗详情 ====== -->
    <a-modal v-if="!isMobile" v-model:open="modalVisible" title="试用期转正审批单" width="900px" :footer="null" :body-style="{ maxHeight: '70vh', overflowY: 'auto' }" class="approval-modal">
      <PrdAnnotation v-if="currentRecord" id="18">
      <div class="approval-sheet">
        <section class="approval-sheet__section">
          <div class="approval-sheet__title">单据信息</div>
          <a-descriptions size="small" :column="2" class="approval-summary">
            <a-descriptions-item label="流程名称" :span="2">{{ currentRecord.emp_name }} 的试用期转正审批流程</a-descriptions-item>
            <a-descriptions-item label="发起人">{{ currentRecord.hrbp_name }}（HRBP）</a-descriptions-item>
          </a-descriptions>
        </section>

        <section class="approval-sheet__section">
          <div class="approval-sheet__title">员工信息</div>
          <a-descriptions size="small" :column="2" class="approval-summary">
            <a-descriptions-item label="员工">{{ currentRecord.emp_name }}/{{ currentRecord.emp_id }}</a-descriptions-item>
            <a-descriptions-item label="入职日期">{{ currentRecord.hire_date }}</a-descriptions-item>
            <a-descriptions-item label="部门">{{ currentRecord.parent_dept }}\{{ currentRecord.dept_name }}</a-descriptions-item>
            <a-descriptions-item label="岗位">{{ currentRecord.position }}</a-descriptions-item>
            <a-descriptions-item label="直属上级">{{ currentRecord.manager_name }}</a-descriptions-item>
            <a-descriptions-item label="HRBP">{{ currentRecord.hrbp_name }}</a-descriptions-item>
            <a-descriptions-item label="试用期评价结果" :span="2">
              <b v-if="currentRecord.final_decision" :style="{ color: isFailedDecision(currentRecord.final_decision) ? '#f5222d' : '#1890ff' }">
                {{ formatDecisionLabel(currentRecord.final_decision) }}
              </b>
              <span v-else style="color: #999">-</span>
            </a-descriptions-item>
          </a-descriptions>
        </section>

        <section class="approval-sheet__section">
          <div class="approval-sheet__title">试用期目标</div>
          <div class="stacked-list">
            <div v-for="(goal, index) in currentRecord.goals" :key="goal.goal_id" class="stacked-item">
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
        </section>

        <section class="approval-sheet__section">
          <div class="approval-sheet__title">评价详情</div>
          <!-- 阶段性反馈 -->
          <div v-if="(currentRecord.stage_evaluations || []).length > 0" style="margin-bottom: 12px">
            <div style="font-weight: 600; margin-bottom: 8px; font-size: 13px">阶段性反馈</div>
            <div class="stacked-list">
              <div v-for="item in currentRecord.stage_evaluations || []" :key="item.stage_eval_id" class="stacked-item">
                <div class="stacked-meta-line">{{ item.evaluator_name }}-{{ item.evaluator_role }} <span>{{ item.create_time }}</span></div>
                <div class="stacked-content">{{ item.content }}</div>
              </div>
            </div>
          </div>
          <div class="approval-eval-section">
            <div class="approval-eval-section__title">员工自评</div>
            <div class="approval-eval-section__body">{{ selfEval?.content || '暂无员工自评' }}</div>
          </div>
          <div class="approval-eval-section">
            <div class="approval-eval-section__title">上级评价</div>
            <div class="manager-eval-block">
              <div class="manager-eval-block__result">
                <span>评价结果</span>
                <div>{{ formatDecisionLabel(currentRecord.final_decision) }}</div>
              </div>
              <div class="manager-eval-block__content">
                <span>评价内容</span>
                <div>{{ normalizeEvalContent(managerEval?.content, currentRecord.final_decision) }}</div>
              </div>
            </div>
          </div>
        </section>

        <section class="approval-sheet__section">
          <div class="approval-sheet__title">审批历史</div>
          <a-table :dataSource="approvalLogRows" :pagination="false" rowKey="key" size="small" bordered>
            <a-table-column title="节点" data-index="node_name" />
            <a-table-column title="审批人" data-index="approver_name" />
            <a-table-column title="审批结果" data-index="action" />
            <a-table-column title="意见" data-index="comment" />
            <a-table-column title="时间" data-index="action_time" />
          </a-table>
        </section>

        <section v-if="activeTab === 'todo'" class="approval-sheet__section">
          <div class="approval-sheet__title">审批意见</div>
          <a-form layout="vertical">
            <a-form-item label="审批意见">
              <a-textarea v-model:value="approvalComment" :rows="4" placeholder="请输入您的审批意见，同意可不填，退回必填" />
            </a-form-item>
            <a-space>
              <a-button @click="modalVisible = false">返回</a-button>
              <a-button danger @click="handleReject" :loading="saving">驳回</a-button>
              <a-button type="primary" @click="handleApprove" :loading="saving">通过</a-button>
            </a-space>
          </a-form>
        </section>
      </div>
      </PrdAnnotation>
    </a-modal>

    <!-- ====== 移动端：iPhone 模拟容器审批详情 ====== -->
    <template v-if="isMobile">
      <a-modal v-model:open="modalVisible" :footer="null" :closable="false" :title="null" wrap-class-name="iphone-sim-modal" width="474px" :body-style="{ padding: 0 }" centered>
        <PrdAnnotation id="18">
        <div class="iphone-container">
          <div class="iphone-screen">
            <!-- 状态栏 -->
            <div class="iphone-status-bar">
              <span class="iphone-status-bar__time">9:41</span>
              <div class="iphone-status-bar__right">
                <svg class="iphone-status-bar__icon" viewBox="0 0 17 12" width="17" height="12"><path d="M1.5 6.5C3 3 6 1 8.5 1s5.5 2 7 5.5" stroke="currentColor" fill="none" stroke-width="1.5" stroke-linecap="round"/><path d="M4 8.5C5 6.5 6.5 5 8.5 5s3.5 1.5 4.5 3.5" stroke="currentColor" fill="none" stroke-width="1.5" stroke-linecap="round"/><circle cx="8.5" cy="10.5" r="1.5" fill="currentColor"/></svg>
                <svg class="iphone-status-bar__icon" viewBox="0 0 16 12" width="16" height="12"><rect x="0.5" y="1" width="3" height="10" rx="0.5" fill="currentColor"/><rect x="4.5" y="3" width="3" height="8" rx="0.5" fill="currentColor"/><rect x="8.5" y="5" width="3" height="6" rx="0.5" fill="currentColor"/><rect x="12.5" y="7" width="3" height="4" rx="0.5" fill="currentColor"/></svg>
                <svg class="iphone-status-bar__icon" viewBox="0 0 25 12" width="25" height="12"><rect x="0" y="1" width="22" height="10" rx="2" stroke="currentColor" fill="none" stroke-width="1"/><rect x="2" y="3" width="16" height="6" rx="1" fill="#34C759"/><rect x="23" y="4" width="2" height="4" rx="1" fill="currentColor"/></svg>
              </div>
            </div>

            <!-- Dynamic Island -->
            <div class="iphone-dynamic-island"></div>

            <!-- 导航栏 -->
            <div class="iphone-header">
              <span class="iphone-header__back" @click="modalVisible = false">
                <svg viewBox="0 0 24 24" width="20" height="20"><path d="M15 19l-7-7 7-7" stroke="currentColor" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
              </span>
              <span class="iphone-header__title">试用期转正审批单</span>
              <span class="iphone-header__placeholder"></span>
            </div>

            <!-- 可滚动内容区 -->
            <div class="iphone-content" v-if="currentRecord">
              <div class="mobile-detail">
                <!-- 单据信息卡片 -->
                <div class="mobile-detail-card">
                  <div class="mobile-detail-card__title">单据信息</div>
                  <div class="mobile-field">
                    <span class="mobile-field__label">流程名称</span>
                    <span class="mobile-field__value">{{ currentRecord.emp_name }} 的试用期转正审批流程</span>
                  </div>
                  <div class="mobile-field">
                    <span class="mobile-field__label">发起人</span>
                    <span class="mobile-field__value">{{ currentRecord.hrbp_name }}（HRBP）</span>
                  </div>
                </div>

                <!-- 员工信息卡片 -->
                <div class="mobile-detail-card">
                  <div class="mobile-detail-card__title">员工信息</div>
                  <div class="mobile-field">
                    <span class="mobile-field__label">员工</span>
                    <span class="mobile-field__value">{{ currentRecord.emp_name }}/{{ currentRecord.emp_id }}</span>
                  </div>
                  <div class="mobile-field">
                    <span class="mobile-field__label">部门</span>
                    <span class="mobile-field__value">{{ currentRecord.parent_dept }}\{{ currentRecord.dept_name }}</span>
                  </div>
                  <div class="mobile-field">
                    <span class="mobile-field__label">岗位</span>
                    <span class="mobile-field__value">{{ currentRecord.position }}</span>
                  </div>
                  <div class="mobile-field">
                    <span class="mobile-field__label">入职时间</span>
                    <span class="mobile-field__value">{{ currentRecord.hire_date }}</span>
                  </div>
                  <div class="mobile-field">
                    <span class="mobile-field__label">直属上级</span>
                    <span class="mobile-field__value">{{ currentRecord.manager_name }}</span>
                  </div>
                  <div class="mobile-field">
                    <span class="mobile-field__label">HRBP</span>
                    <span class="mobile-field__value">{{ currentRecord.hrbp_name }}</span>
                  </div>
                </div>

                <!-- 目标摘要卡片 -->
                <div class="mobile-detail-card">
                  <div class="mobile-detail-card__title">试用期目标</div>
                  <div v-if="currentRecord.goals.length === 0" class="mobile-empty-inline">暂无目标数据</div>
                  <div v-for="goal in currentRecord.goals" :key="goal.goal_id" class="mobile-goal-item">
                          <div class="mobile-goal-item__content">{{ goal.content }}</div>
                    <div class="mobile-goal-item__measure">
                      <span class="mobile-field__label">预期结果：</span>{{ goal.measure }}
                    </div>
                    <div v-if="goal.weight != null" class="mobile-goal-item__weight">
                      <span class="mobile-field__label">权重：</span>{{ goal.weight }}%
                    </div>
                    <div class="mobile-goal-item__review">
                      <span class="mobile-field__label">目标回顾：</span>{{ goal.goal_review || '暂无目标回顾' }}
                    </div>
                  </div>
                </div>

                <!-- 评价摘要卡片 -->
                <div class="mobile-detail-card">
                  <div class="mobile-detail-card__title">评价详情</div>
                  <div class="mobile-eval-item">
                    <div class="mobile-eval-item__header">
                      <span class="mobile-eval-item__type">员工自评</span>
                      <span class="mobile-eval-item__owner">{{ selfEval?.evaluator_name || '-' }}</span>
                    </div>
                    <div class="mobile-eval-item__content">{{ selfEval?.content || '暂无员工自评' }}</div>
                  </div>
                  <div class="mobile-eval-item">
                    <div class="mobile-eval-item__header">
                      <span class="mobile-eval-item__type">上级评价</span>
                      <span class="mobile-eval-item__owner">{{ managerEval?.evaluator_name || '-' }}</span>
                    </div>
                    <div class="mobile-eval-item__content">评价结果：{{ formatDecisionLabel(currentRecord.final_decision) }}</div>
                    <div class="mobile-eval-item__content">评价内容：{{ normalizeEvalContent(managerEval?.content, currentRecord.final_decision) }}</div>
                  </div>
                </div>

                <!-- 审批历史卡片 -->
                <div class="mobile-detail-card">
                  <div class="mobile-detail-card__title">审批历史</div>
                  <div v-if="approvalLogRows.length === 1 && approvalLogRows[0].node_name === '-'" class="mobile-empty-inline">暂无审批历史</div>
                  <div v-else v-for="log in approvalLogRows" :key="log.key" class="mobile-log-item">
                    <div class="mobile-log-item__header">
                      <span class="mobile-log-item__node">{{ log.node_name }}</span>
                      <span class="mobile-log-item__action" :style="{ color: log.action === '同意' ? '#52c41a' : '#f5222d' }">{{ log.action }}</span>
                    </div>
                    <div class="mobile-log-item__info">
                      <span>{{ log.approver_name }}</span>
                      <span class="mobile-log-item__time">{{ log.action_time }}</span>
                    </div>
                    <div v-if="log.comment && log.comment !== '-'" class="mobile-log-item__comment">{{ log.comment }}</div>
                  </div>
                </div>

                <!-- 审批意见卡片（待办时显示，随内容滚动） -->
                <div v-if="activeTab === 'todo'" class="mobile-detail-card">
                  <div class="mobile-detail-card__title">审批意见</div>
                  <a-textarea v-model:value="approvalComment" :rows="3" placeholder="退回时必填，同意可不填" />
                </div>
              </div>
            </div>

            <!-- 底部固定操作栏（待办时显示） -->
            <div v-if="activeTab === 'todo'" class="iphone-fixed-action-bar">
              <a-button class="iphone-fixed-action-bar__btn" danger @click="handleReject" :loading="saving">驳回</a-button>
              <a-button class="iphone-fixed-action-bar__btn" type="primary" @click="handleApprove" :loading="saving">通过</a-button>
            </div>

            <!-- Home Indicator -->
            <div class="iphone-home-indicator"></div>
          </div>
        </div>
        </PrdAnnotation>
      </a-modal>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useProbationStore, type ProbationMaster, formatDecisionLabel, isFailedDecision } from '@/store/probation'
import { message } from 'ant-design-vue'
import PrdAnnotation from '@/components/prd/PrdAnnotation.vue'

const store = useProbationStore()
const route = useRoute()
const activeTab = ref('todo')
const isMobile = ref(false)

const todoList = computed(() => store.records.filter(r => r.probation_status === '08'))
const doneList = computed(() => store.records.filter(r => ['10'].includes(r.probation_status) && r.approval_logs.length > 0))

const columns = [
  { title: '流程名称', customRender: ({ record }: any) => `${record.emp_name} 的试用期转正审批流程`, width: 200 },
  { title: '员工姓名', dataIndex: 'emp_name', width: 90 },
  { title: '工号', dataIndex: 'emp_id', width: 80 },
  { title: '部门', dataIndex: 'dept_display', width: 160 },
  { title: '入职日期', dataIndex: 'hire_date', width: 110 },
  { title: '流程发起人', dataIndex: 'hrbp_name', width: 100 },
  { title: '操作', key: 'action', width: 80 }
]

const doneColumns = [
  { title: '流程名称', customRender: ({ record }: any) => `${record.emp_name} 的试用期转正审批流程`, width: 200 },
  { title: '员工姓名', dataIndex: 'emp_name', width: 90 },
  { title: '工号', dataIndex: 'emp_id', width: 80 },
  { title: '部门', dataIndex: 'dept_display', width: 160 },
  { title: '入职日期', dataIndex: 'hire_date', width: 110 },
  { title: '上级评价结果', dataIndex: 'final_decision', width: 160 },
  { title: '操作', key: 'action', width: 80 }
]

const modalVisible = ref(false)
const currentRecord = ref<ProbationMaster | null>(null)
const approvalComment = ref('')
const saving = ref(false)

const selfEval = computed(() => currentRecord.value?.evaluations.find(e => e.eval_type === 'self'))
const managerEval = computed(() => currentRecord.value?.evaluations.find(e => e.eval_type === 'manager'))

const approvalLogRows = computed(() => {
  if (!currentRecord.value || currentRecord.value.approval_logs.length === 0) {
    return [{ key: 'empty', node_name: '-', approver_name: '-', action: '-', comment: '暂无审批历史', action_time: '-' }]
  }
  return currentRecord.value.approval_logs.map(log => ({
    key: log.log_id,
    ...log,
    comment: log.comment || '-'
  }))
})

function openModal(record: ProbationMaster) {
  currentRecord.value = record
  approvalComment.value = ''
  modalVisible.value = true
}

function normalizeEvalContent(content?: string, decision?: string) {
  if (!content) return '暂无上级评价';
  const label = formatDecisionLabel(decision);
  const normalized = content.trim();
  if (label !== '-' && normalized.startsWith(label)) {
    return normalized.slice(label.length).replace(/^\s*[-－—]\s*/, '') || normalized;
  }
  return normalized.replace(/^(超出预期|符合预期|不符合转正条件|不通过)\s*[-－—]\s*/, '');
}

function handleApprove() {
  if (!currentRecord.value) return
  saving.value = true
  setTimeout(() => {
    store.approveRecord(currentRecord.value!.master_id, '审批人A', '二级部门负责人', approvalComment.value || '同意转正')
    message.success('已同意审批，流转至 HRBP 发布结果')
    saving.value = false
    modalVisible.value = false
  }, 600)
}

function handleReject() {
  if (!approvalComment.value.trim()) {
    message.error('驳回意见为必填项，请填写后重试')
    return
  }
  if (!currentRecord.value) return
  saving.value = true
  setTimeout(() => {
    store.rejectRecord(currentRecord.value!.master_id, '审批人A', '二级部门负责人', approvalComment.value)
    message.warning('已退回至评估阶段')
    saving.value = false
    modalVisible.value = false
  }, 600)
}

function syncPrdRoute(prdQuery: unknown) {
  const prdId = Number(prdQuery)
  if (!Number.isFinite(prdId)) return

  if (prdId === 18) {
    activeTab.value = 'todo'
    const record = todoList.value[0] ?? doneList.value[0]
    if (record) openModal(record)
  }
}

onMounted(() => {
  syncPrdRoute(route.query.prd)
})

watch(() => route.query.prd, syncPrdRoute)
</script>

<style scoped>
/* ====== PC 审批单：去框化分区 + 多行表单 ====== */
.approval-sheet {
  color: #1f2937;
}

.approval-sheet__section {
  padding: 4px 0 18px;
  margin-bottom: 18px;
  border: none;
  border-bottom: 1px solid #eef0f4;
  background: transparent;
}

.approval-sheet__section:last-child {
  border-bottom: none;
  margin-bottom: 0;
}

.approval-sheet__title {
  margin-bottom: 10px;
  font-size: 15px;
  font-weight: 700;
  color: #111827;
}

.approval-summary :deep(.ant-descriptions-view) {
  border: none;
}

.approval-summary :deep(.ant-descriptions-row > th),
.approval-summary :deep(.ant-descriptions-row > td) {
  border: none;
  padding: 6px 10px 6px 0;
  background: transparent;
}

.approval-summary :deep(.ant-descriptions-item-label) {
  width: 96px;
  color: #6b7280;
  font-weight: 500;
  white-space: nowrap;
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

.stacked-content {
  padding-top: 6px;
  border-top: 1px dashed #e7eaf0;
  color: #1f2937;
  font-size: 13px;
  line-height: 1.7;
  white-space: pre-wrap;
  word-break: break-word;
}

.approval-eval-section {
  margin-top: 12px;
}

.approval-eval-section__title {
  margin-bottom: 8px;
  font-size: 13px;
  font-weight: 700;
  color: #111827;
}

.approval-eval-section__body {
  padding: 10px 12px;
  border: 1px solid #edf0f5;
  border-radius: 8px;
  background: #fbfcfe;
  color: #1f2937;
  font-size: 13px;
  line-height: 1.7;
  white-space: pre-wrap;
}

.manager-eval-block {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 10px 12px;
  border: 1px solid #edf0f5;
  border-radius: 8px;
  background: #fbfcfe;
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
  color: #6b7280;
  font-weight: 600;
}

.manager-eval-block__result > div,
.manager-eval-block__content > div {
  color: #1f2937;
  font-size: 13px;
  line-height: 1.7;
  white-space: pre-wrap;
}

/* ====== 移动端容器 ====== */
.approval-page--mobile {
  max-width: 375px;
  margin: 0 auto;
  border-radius: 12px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.10);
  background: #f5f5f5;
  min-height: 667px;
  overflow: hidden;
  font-size: 14px;
  line-height: 1.5;
  color: #333;
}

.approval-page--mobile :deep(.ant-page-header) {
  padding: 12px 16px;
  background: #fff;
}

.approval-page--mobile :deep(.ant-page-header-heading-title) {
  font-size: 16px;
}

/* ====== 移动端 Tab 栏 ====== */
.mobile-tabs {
  display: flex;
  background: #fff;
  border-bottom: 1px solid #f0f0f0;
}

.mobile-tab {
  flex: 1;
  text-align: center;
  padding: 12px 0;
  font-size: 14px;
  color: #999;
  position: relative;
  cursor: pointer;
  transition: color 0.2s;
}

.mobile-tab--active {
  color: #1890ff;
  font-weight: 600;
}

.mobile-tab--active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 24px;
  height: 2px;
  background: #1890ff;
  border-radius: 1px;
}

.mobile-tab__badge {
  display: inline-block;
  background: #ff4d4f;
  color: #fff;
  font-size: 10px;
  min-width: 16px;
  height: 16px;
  line-height: 16px;
  border-radius: 8px;
  padding: 0 4px;
  margin-left: 4px;
  vertical-align: top;
}

/* ====== 移动端卡片列表 ====== */
.mobile-list {
  padding: 12px;
}

.mobile-card {
  background: #fff;
  border-radius: 8px;
  margin-bottom: 12px;
  overflow: hidden;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
}

.mobile-card__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px 0;
}

.mobile-card__name {
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.mobile-card__dept {
  font-size: 12px;
  color: #999;
}

.mobile-card__body {
  padding: 8px 16px;
}

.mobile-card__title {
  font-size: 14px;
  color: #666;
  margin-bottom: 4px;
}

.mobile-card__meta {
  font-size: 12px;
  color: #999;
}

.mobile-card__footer {
  padding: 8px 16px 12px;
}

.mobile-empty {
  text-align: center;
  padding: 48px 16px;
  color: #bbb;
  font-size: 14px;
}

/* ====== iPhone 模拟容器弹窗 ====== */
.approval-page--mobile :deep(.iphone-sim-modal .ant-modal) {
  top: 0;
  padding: 0;
}

.approval-page--mobile :deep(.iphone-sim-modal .ant-modal-content) {
  padding: 0;
  background: transparent;
  box-shadow: none;
  border-radius: 0;
}

.approval-page--mobile :deep(.iphone-sim-modal .ant-modal-body) {
  padding: 0 !important;
}

.approval-page--mobile :deep(.iphone-sim-modal .ant-modal-mask) {
  background-color: rgba(0, 0, 0, 0.45);
}

.iphone-container {
  width: 430px;
  height: 932px;
  background: #000;
  border-radius: 55px;
  padding: 12px;
  box-shadow: 0 0 0 2px #333, 0 20px 60px rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  margin: 0 auto;
}

.iphone-screen {
  width: 100%;
  height: 100%;
  background: #fff;
  border-radius: 44px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  position: relative;
}

/* 状态栏 */
.iphone-status-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 28px 0;
  height: 54px;
  flex-shrink: 0;
  z-index: 10;
  background: #fff;
}

.iphone-status-bar__time {
  font-size: 15px;
  font-weight: 600;
  color: #000;
  letter-spacing: 0.5px;
}

.iphone-status-bar__right {
  display: flex;
  align-items: center;
  gap: 6px;
}

.iphone-status-bar__icon {
  color: #000;
}

/* Dynamic Island */
.iphone-dynamic-island {
  position: absolute;
  top: 12px;
  left: 50%;
  transform: translateX(-50%);
  width: 126px;
  height: 37px;
  background: #000;
  border-radius: 22px;
  z-index: 20;
}

/* 导航栏 */
.iphone-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  height: 44px;
  flex-shrink: 0;
  background: #fff;
  border-bottom: 1px solid #f0f0f0;
}

.iphone-header__back {
  color: #1890ff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  transition: background-color 0.2s;
}

.iphone-header__back:hover {
  background-color: #f0f5ff;
}

.iphone-header__title {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  flex: 1;
  text-align: center;
}

.iphone-header__placeholder {
  width: 32px;
  height: 32px;
}

/* 可滚动内容区 */
.iphone-content {
  flex: 1;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  background: #f5f5f5;
}

/* Home Indicator */
.iphone-home-indicator {
  position: absolute;
  bottom: 8px;
  left: 50%;
  transform: translateX(-50%);
  width: 134px;
  height: 5px;
  background: #d1d1d6;
  border-radius: 3px;
  z-index: 10;
}

/* ====== 移动端详情内容 ====== */
.mobile-detail {
  padding: 12px;
  padding-bottom: 16px;
}

.mobile-detail-card {
  background: #fff;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 12px;
}

.mobile-detail-card__title {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #f5f5f5;
}

.mobile-field {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 6px 0;
  font-size: 14px;
}

.mobile-field__label {
  color: #999;
  flex-shrink: 0;
  min-width: 72px;
  margin-right: 12px;
}

.mobile-field__value {
  color: #333;
  text-align: right;
  flex: 1;
  word-break: break-all;
}

/* ====== 目标项（TASK-016 优化移动端阅读） ====== */
.mobile-goal-item {
  padding: 12px 0;
  border-bottom: 1px solid #f5f5f5;
}

.mobile-goal-item:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.mobile-goal-item__tag {
  display: inline-block;
  background: #e6f7ff;
  color: #1890ff;
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 4px;
  margin-bottom: 6px;
}

.mobile-goal-item__content {
  font-size: 15px;
  color: #333;
  margin-bottom: 8px;
  line-height: 1.6;
  word-break: break-all;
}

.mobile-goal-item__measure,
.mobile-goal-item__review {
  font-size: 14px;
  color: #666;
  margin-top: 6px;
  line-height: 1.6;
  word-break: break-all;
}

.mobile-goal-item__measure .mobile-field__label,
.mobile-goal-item__review .mobile-field__label {
  font-size: 13px;
}

/* ====== 评价项 ====== */
.mobile-eval-item {
  padding: 10px 0;
  border-bottom: 1px solid #f5f5f5;
}

.mobile-eval-item:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.mobile-eval-item__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.mobile-eval-item__type {
  font-size: 14px;
  font-weight: 500;
  color: #333;
}

.mobile-eval-item__owner {
  font-size: 12px;
  color: #999;
}

.mobile-eval-item__content {
  font-size: 13px;
  color: #666;
  line-height: 1.6;
}

/* ====== 审批历史 ====== */
.mobile-log-item {
  padding: 10px 0;
  border-bottom: 1px solid #f5f5f5;
}

.mobile-log-item:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.mobile-log-item__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2px;
}

.mobile-log-item__node {
  font-size: 14px;
  font-weight: 500;
  color: #333;
}

.mobile-log-item__action {
  font-size: 13px;
  font-weight: 500;
}

.mobile-log-item__info {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #999;
  margin-bottom: 2px;
}

.mobile-log-item__time {
  font-size: 11px;
  color: #bbb;
}

.mobile-log-item__comment {
  font-size: 12px;
  color: #666;
  background: #fafafa;
  padding: 6px 8px;
  border-radius: 4px;
  margin-top: 4px;
}

.mobile-empty-inline {
  text-align: center;
  padding: 16px 0;
  color: #bbb;
  font-size: 13px;
}

/* ====== iPhone 底部固定操作栏（TASK-015） ====== */
.iphone-fixed-action-bar {
  display: flex;
  gap: 12px;
  padding: 10px 16px;
  padding-bottom: 24px;
  background: #fff;
  border-top: 1px solid #f0f0f0;
  flex-shrink: 0;
}

.iphone-fixed-action-bar__btn {
  flex: 1;
  height: 44px;
  font-size: 15px;
  border-radius: 8px;
}
</style>
