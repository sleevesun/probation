<template>
  <div class="approval-page" :class="{ 'approval-page--mobile': isMobile }">
    <a-page-header title="审批中心" :sub-title="isMobile ? '' : '您的待办与已办审批单据'">
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
                <a-button type="primary" size="small" @click="openModal(record)">查看审批单</a-button>
              </template>
            </template>
          </a-table>
        </a-tab-pane>

        <a-tab-pane key="done" tab="我已审批">
          <a-table :dataSource="doneList" :columns="doneColumns" rowKey="master_id" bordered>
            <template #bodyCell="{ column, record }">
              <template v-if="column.dataIndex === 'dept_display'">{{ record.parent_dept }}\{{ record.dept_name }}</template>
              <template v-if="column.dataIndex === 'final_decision'">
                <a-tag :color="record.final_decision === '不符合录用条件' ? 'error' : 'success'">{{ record.final_decision || '-' }}</a-tag>
              </template>
              <template v-if="column.key === 'action'">
                <a-button size="small" @click="openModal(record)">查看审批单</a-button>
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
              <span class="mobile-card__name">{{ record.emp_name }}</span>
              <span class="mobile-card__dept">{{ record.parent_dept }}\{{ record.dept_name }}</span>
            </div>
            <div class="mobile-card__body">
              <div class="mobile-card__title">关于 {{ record.emp_name }} 的试用期转正申请</div>
              <div class="mobile-card__meta">
                <span>发起人：{{ record.hrbp_name }}</span>
              </div>
            </div>
            <div class="mobile-card__footer">
              <a-button type="primary" block @click.stop="openModal(record)">查看审批单</a-button>
            </div>
          </div>
        </template>

        <!-- 已办卡片 -->
        <template v-if="activeTab === 'done'">
          <div v-if="!doneList.length" class="mobile-empty">暂无已审批单据</div>
          <div v-for="record in doneList" :key="record.master_id" class="mobile-card" @click="openModal(record)">
            <div class="mobile-card__header">
              <span class="mobile-card__name">{{ record.emp_name }}</span>
              <a-tag :color="record.final_decision === '不符合录用条件' ? 'error' : 'success'" size="small">{{ record.final_decision || '-' }}</a-tag>
            </div>
            <div class="mobile-card__body">
              <div class="mobile-card__title">关于 {{ record.emp_name }} 的试用期转正申请</div>
              <div class="mobile-card__meta">
                <span>{{ record.parent_dept }}\{{ record.dept_name }}</span>
              </div>
            </div>
            <div class="mobile-card__footer">
              <a-button block @click.stop="openModal(record)">查看审批单</a-button>
            </div>
          </div>
        </template>
      </div>
    </template>

    <!-- ====== PC 端：弹窗详情 ====== -->
    <a-modal v-if="!isMobile" v-model:open="modalVisible" title="试用期转正审批单" width="900px" :footer="null" :body-style="{ maxHeight: '70vh', overflowY: 'auto' }" class="approval-modal">
      <div v-if="currentRecord" class="approval-sheet">
        <section class="approval-sheet__section">
          <div class="approval-sheet__title">单据概览</div>
          <a-descriptions bordered size="small" :column="2">
            <a-descriptions-item label="单据标题" :span="2">关于 {{ currentRecord.emp_name }} 的试用期转正申请</a-descriptions-item>
            <a-descriptions-item label="发起人">{{ currentRecord.hrbp_name }}（HRBP）</a-descriptions-item>
            <a-descriptions-item label="姓名">{{ currentRecord.emp_name }}</a-descriptions-item>
            <a-descriptions-item label="工号">{{ currentRecord.emp_id }}</a-descriptions-item>
            <a-descriptions-item label="岗位">{{ currentRecord.position }}</a-descriptions-item>
            <a-descriptions-item label="部门">{{ currentRecord.parent_dept }}\{{ currentRecord.dept_name }}</a-descriptions-item>
            <a-descriptions-item label="直属主管">{{ currentRecord.manager_name }}</a-descriptions-item>
            <a-descriptions-item label="HRBP">{{ currentRecord.hrbp_name }}</a-descriptions-item>
            <a-descriptions-item label="入职时间">{{ currentRecord.hire_date }}</a-descriptions-item>
            <a-descriptions-item label="建议结论">
              <b :style="{ color: currentRecord.final_decision === '不符合录用条件' ? '#f5222d' : '#1890ff' }">
                {{ currentRecord.final_decision || '待明确' }}
              </b>
            </a-descriptions-item>
          </a-descriptions>
        </section>

        <section class="approval-sheet__section">
          <div class="approval-sheet__title">目标摘要</div>
          <a-table :dataSource="currentRecord.goals" :pagination="false" rowKey="goal_id" size="small" bordered>
            <a-table-column title="维度" data-index="dimension" width="80" />
            <a-table-column title="目标内容" data-index="content" />
            <a-table-column title="衡量方式/预期结果" data-index="measure" />
            <a-table-column title="目标回顾" data-index="goal_review">
              <template #bodyCell="{ record }">
                <span>{{ record.goal_review || '暂无目标回顾' }}</span>
              </template>
            </a-table-column>
          </a-table>
        </section>

        <section class="approval-sheet__section">
          <div class="approval-sheet__title">评价摘要</div>
          <a-table :dataSource="evaluationRows" :pagination="false" rowKey="key" size="small" bordered>
            <a-table-column title="评价类型" data-index="label" />
            <a-table-column title="评价人" data-index="owner" />
            <a-table-column title="内容摘要" data-index="content" />
          </a-table>
        </section>

        <section class="approval-sheet__section">
          <div class="approval-sheet__title">审批历史</div>
          <a-table :dataSource="approvalLogRows" :pagination="false" rowKey="key" size="small" bordered>
            <a-table-column title="节点" data-index="node_name" />
            <a-table-column title="审批人" data-index="approver_name" />
            <a-table-column title="动作" data-index="action" />
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
              <a-button @click="modalVisible = false">取消返回</a-button>
              <a-button danger @click="handleReject" :loading="saving">退回/拒绝</a-button>
              <a-button type="primary" @click="handleApprove" :loading="saving">同意</a-button>
            </a-space>
          </a-form>
        </section>
      </div>
    </a-modal>

    <!-- ====== 移动端：iPhone 模拟容器审批详情 ====== -->
    <template v-if="isMobile">
      <a-modal v-model:open="modalVisible" :footer="null" :closable="false" :title="null" wrap-class-name="iphone-sim-modal" width="474px" :body-style="{ padding: 0 }" centered>
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
                <!-- 基本信息卡片 -->
                <div class="mobile-detail-card">
                  <div class="mobile-detail-card__title">单据概览</div>
                  <div class="mobile-field">
                    <span class="mobile-field__label">单据标题</span>
                    <span class="mobile-field__value">关于 {{ currentRecord.emp_name }} 的试用期转正申请</span>
                  </div>
                  <div class="mobile-field">
                    <span class="mobile-field__label">发起人</span>
                    <span class="mobile-field__value">{{ currentRecord.hrbp_name }}（HRBP）</span>
                  </div>
                  <div class="mobile-field">
                    <span class="mobile-field__label">姓名</span>
                    <span class="mobile-field__value">{{ currentRecord.emp_name }}</span>
                  </div>
                  <div class="mobile-field">
                    <span class="mobile-field__label">工号</span>
                    <span class="mobile-field__value">{{ currentRecord.emp_id }}</span>
                  </div>
                  <div class="mobile-field">
                    <span class="mobile-field__label">岗位</span>
                    <span class="mobile-field__value">{{ currentRecord.position }}</span>
                  </div>
                  <div class="mobile-field">
                    <span class="mobile-field__label">部门</span>
                    <span class="mobile-field__value">{{ currentRecord.parent_dept }}\{{ currentRecord.dept_name }}</span>
                  </div>
                  <div class="mobile-field">
                    <span class="mobile-field__label">直属主管</span>
                    <span class="mobile-field__value">{{ currentRecord.manager_name }}</span>
                  </div>
                  <div class="mobile-field">
                    <span class="mobile-field__label">HRBP</span>
                    <span class="mobile-field__value">{{ currentRecord.hrbp_name }}</span>
                  </div>
                  <div class="mobile-field">
                    <span class="mobile-field__label">入职时间</span>
                    <span class="mobile-field__value">{{ currentRecord.hire_date }}</span>
                  </div>
                  <div class="mobile-field">
                    <span class="mobile-field__label">建议结论</span>
                    <span class="mobile-field__value" :style="{ color: currentRecord.final_decision === '不符合录用条件' ? '#f5222d' : '#1890ff', fontWeight: 600 }">
                      {{ currentRecord.final_decision || '待明确' }}
                    </span>
                  </div>
                </div>

                <!-- 目标摘要卡片 -->
                <div class="mobile-detail-card">
                  <div class="mobile-detail-card__title">目标摘要</div>
                  <div v-if="currentRecord.goals.length === 0" class="mobile-empty-inline">暂无目标数据</div>
                  <div v-for="goal in currentRecord.goals" :key="goal.goal_id" class="mobile-goal-item">
                    <div class="mobile-goal-item__tag">{{ goal.dimension }}</div>
                    <div class="mobile-goal-item__content">{{ goal.content }}</div>
                    <div class="mobile-goal-item__measure">
                      <span class="mobile-field__label">衡量方式：</span>{{ goal.measure }}
                    </div>
                    <div class="mobile-goal-item__review">
                      <span class="mobile-field__label">目标回顾：</span>{{ goal.goal_review || '暂无目标回顾' }}
                    </div>
                  </div>
                </div>

                <!-- 评价摘要卡片 -->
                <div class="mobile-detail-card">
                  <div class="mobile-detail-card__title">评价摘要</div>
                  <div v-for="row in evaluationRows" :key="row.key" class="mobile-eval-item">
                    <div class="mobile-eval-item__header">
                      <span class="mobile-eval-item__type">{{ row.label }}</span>
                      <span class="mobile-eval-item__owner">{{ row.owner }}</span>
                    </div>
                    <div class="mobile-eval-item__content">{{ row.content }}</div>
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
      </a-modal>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useProbationStore, type ProbationMaster } from '@/store/probation'
import { message } from 'ant-design-vue'

const store = useProbationStore()
const activeTab = ref('todo')
const isMobile = ref(false)

const todoList = computed(() => store.records.filter(r => r.probation_status === '08'))
const doneList = computed(() => store.records.filter(r => ['09', '10'].includes(r.probation_status) && r.approval_logs.length > 0))

const columns = [
  { title: '标题', customRender: ({ record }: any) => `关于 ${record.emp_name} 的试用期转正申请` },
  { title: '部门', dataIndex: 'dept_display', width: 180 },
  { title: '发起人', dataIndex: 'hrbp_name' },
  { title: '操作', key: 'action', width: 140 }
]

const doneColumns = [
  { title: '标题', customRender: ({ record }: any) => `关于 ${record.emp_name} 的试用期转正申请` },
  { title: '部门', dataIndex: 'dept_display', width: 180 },
  { title: '结论', dataIndex: 'final_decision', width: 150 },
  { title: '操作', key: 'action', width: 140 }
]

const modalVisible = ref(false)
const currentRecord = ref<ProbationMaster | null>(null)
const approvalComment = ref('')
const saving = ref(false)

const evaluationRows = computed(() => {
  if (!currentRecord.value) return []
  return [
    formatEvalRow('员工自评', 'self'),
    formatEvalRow('直属主管评价', 'manager'),
    formatEvalRow('HRBP发起说明', 'hrbp')
  ]
})

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

function getEval(record: ProbationMaster, type: string) {
  return record.evaluations?.find(e => e.eval_type === type)
}

function formatEvalRow(label: string, type: string) {
  const current = currentRecord.value!
  const evalItem = getEval(current, type)
  return {
    key: type,
    label,
    owner: evalItem?.evaluator_name || '-',
    content: evalItem?.content || '暂无'
  }
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
</script>

<style scoped>
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
