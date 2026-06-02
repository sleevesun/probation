<template>
  <div class="ps-page" :class="{ 'ps-page--mobile': isMobile }">
    <div class="ps-page__header">
      <div>
        <div class="ps-page__title">审批中心</div>
        <div class="ps-page__subtitle" v-if="!isMobile">以 PeopleSoft 风格展示待审批列表与审批单详情。</div>
      </div>
      <div class="ps-page__header-extra">
        <span style="font-size: 13px; color: #666;">{{ isMobile ? '移动端视图' : 'PC端视图' }}</span>
        <a-switch v-model:checked="isMobile" checked-children="移动" un-checked-children="PC" />
      </div>
    </div>

    <!-- ====== PC 端：表格列表 ====== -->
    <template v-if="!isMobile">
      <section class="ps-panel">
        <div class="ps-toolbar">
          <span class="ps-tab" :class="{ 'ps-tab--active': activeTab === 'todo' }" @click="activeTab = 'todo'">待我审批</span>
          <span class="ps-tab" :class="{ 'ps-tab--active': activeTab === 'done' }" @click="activeTab = 'done'">我已审批</span>
        </div>

        <table class="ps-table">
          <thead>
            <tr>
              <th>标题</th>
              <th>部门</th>
              <th>结论</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!list.length">
              <td colspan="4">暂无审批单据</td>
            </tr>
            <tr v-for="item in list" :key="item.master_id">
              <td>关于 {{ item.emp_name }} 的试用期转正申请</td>
              <td>{{ item.parent_dept }}\{{ item.dept_name }}</td>
              <td :style="{ color: psDecisionColor(item.final_decision) }">{{ item.final_decision || '-' }}</td>
              <td><a-button size="small" @click="openDetail(item)">查看审批单</a-button></td>
            </tr>
          </tbody>
        </table>
      </section>
    </template>

    <!-- ====== 移动端：卡片列表 ====== -->
    <template v-else>
      <div class="mobile-tabs">
        <div class="mobile-tab" :class="{ 'mobile-tab--active': activeTab === 'todo' }" @click="activeTab = 'todo'">
          待我审批 <span v-if="todoCount" class="mobile-tab__badge">{{ todoCount }}</span>
        </div>
        <div class="mobile-tab" :class="{ 'mobile-tab--active': activeTab === 'done' }" @click="activeTab = 'done'">
          我已审批 <span v-if="doneCount" class="mobile-tab__badge">{{ doneCount }}</span>
        </div>
      </div>

      <div class="mobile-list">
        <div v-if="!list.length" class="mobile-empty">暂无审批单据</div>
        <div v-for="item in list" :key="item.master_id" class="mobile-card" @click="openDetail(item)">
          <div class="mobile-card__header">
            <span class="mobile-card__name">{{ item.emp_name }}</span>
            <span v-if="item.final_decision" class="mobile-card__decision" :style="{ color: psDecisionColor(item.final_decision) }">{{ item.final_decision }}</span>
          </div>
          <div class="mobile-card__body">
            <div class="mobile-card__title">关于 {{ item.emp_name }} 的试用期转正申请</div>
            <div class="mobile-card__meta">
              <span>{{ item.parent_dept }}\{{ item.dept_name }}</span>
            </div>
          </div>
          <div class="mobile-card__footer">
            <a-button type="primary" block @click.stop="openDetail(item)">查看审批单</a-button>
          </div>
        </div>
      </div>
    </template>

    <!-- ====== PC 端：弹窗详情 ====== -->
    <a-modal v-if="!isMobile" v-model:open="detailVisible" title="试用期转正审批单" width="1080px" :footer="null" wrap-class-name="ps-modal-wrap">
      <div v-if="currentRecord" class="ps-modal-content">
        <div class="ps-sheet">
          <section class="ps-sheet__section">
            <div class="ps-section-title">单据概览</div>
            <div class="ps-form-grid">
              <div class="ps-field"><label>单据标题</label><div>关于 {{ currentRecord.emp_name }} 的试用期转正申请</div></div>
              <div class="ps-field"><label>发起人</label><div>{{ currentRecord.hrbp_name }}（HRBP）</div></div>
              <div class="ps-field"><label>建议结论</label><div>{{ currentRecord.final_decision || '待明确' }}</div></div>
              <div class="ps-field"><label>姓名</label><div>{{ currentRecord.emp_name }}</div></div>
              <div class="ps-field"><label>工号</label><div>{{ currentRecord.emp_id }}</div></div>
              <div class="ps-field"><label>岗位</label><div>{{ currentRecord.position }}</div></div>
              <div class="ps-field"><label>部门</label><div>{{ currentRecord.parent_dept }}\{{ currentRecord.dept_name }}</div></div>
              <div class="ps-field"><label>直属主管</label><div>{{ currentRecord.manager_name }}</div></div>
              <div class="ps-field"><label>HRBP</label><div>{{ currentRecord.hrbp_name }}</div></div>
            </div>
          </section>

          <section class="ps-sheet__section">
            <div class="ps-section-title">目标摘要</div>
            <table class="ps-table">
              <thead><tr><th>维度</th><th>目标内容</th><th>衡量方式</th><th>目标回顾</th></tr></thead>
              <tbody>
                <tr v-if="!currentRecord.goals.length">
                  <td colspan="4">暂无目标数据</td>
                </tr>
                <tr v-for="goal in currentRecord.goals" :key="goal.goal_id">
                  <td>{{ goal.dimension }}</td>
                  <td>{{ goal.content }}</td>
                  <td>{{ goal.measure }}</td>
                  <td>{{ goal.goal_review || '暂无' }}</td>
                </tr>
              </tbody>
            </table>
          </section>

          <section class="ps-sheet__section">
            <div class="ps-section-title">评价摘要</div>
            <table class="ps-table">
              <thead><tr><th>评价类型</th><th>评价人</th><th>内容摘要</th></tr></thead>
              <tbody>
                <tr v-for="item in evaluationRows" :key="item.key">
                  <td>{{ item.label }}</td>
                  <td>{{ item.owner }}</td>
                  <td>{{ item.content }}</td>
                </tr>
              </tbody>
            </table>
          </section>

          <section class="ps-sheet__section">
            <div class="ps-section-title">审批历史</div>
            <table class="ps-table">
              <thead><tr><th>节点</th><th>审批人</th><th>动作</th><th>意见</th><th>时间</th></tr></thead>
              <tbody>
                <tr v-if="!currentRecord.approval_logs.length">
                  <td colspan="5">暂无审批历史</td>
                </tr>
                <tr v-for="log in currentRecord.approval_logs" :key="log.log_id">
                  <td>{{ log.node_name }}</td>
                  <td>{{ log.approver_name }}</td>
                  <td>{{ log.action }}</td>
                  <td>{{ log.comment || '-' }}</td>
                  <td>{{ log.action_time }}</td>
                </tr>
              </tbody>
            </table>
          </section>

          <section v-if="activeTab === 'todo'" class="ps-sheet__section">
            <div class="ps-section-title">审批意见</div>
            <a-textarea v-model:value="comment" :rows="4" placeholder="请输入审批意见，退回时必填" />
            <div class="ps-toolbar" style="margin-top: 16px">
              <div class="ps-toolbar__spacer"></div>
              <a-button size="small" @click="detailVisible = false">取消</a-button>
              <a-button danger size="small" @click="rejectRecord">退回</a-button>
              <a-button type="primary" size="small" @click="approveRecord">同意</a-button>
            </div>
          </section>
        </div>
      </div>
    </a-modal>

    <!-- ====== 移动端：iPhone 模拟容器审批详情 ====== -->
    <template v-if="isMobile">
      <a-modal v-model:open="detailVisible" :footer="null" :closable="false" :title="null" wrap-class-name="iphone-sim-modal" width="474px" :body-style="{ padding: 0 }" centered>
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
              <span class="iphone-header__back" @click="detailVisible = false">
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
                    <span class="mobile-field__label">建议结论</span>
                    <span class="mobile-field__value" :style="{ color: psDecisionColor(currentRecord.final_decision), fontWeight: 600 }">{{ currentRecord.final_decision || '待明确' }}</span>
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
                </div>

                <!-- 目标摘要卡片 -->
                <div class="mobile-detail-card">
                  <div class="mobile-detail-card__title">目标摘要</div>
                  <div v-if="!currentRecord.goals.length" class="mobile-empty-inline">暂无目标数据</div>
                  <div v-for="goal in currentRecord.goals" :key="goal.goal_id" class="mobile-goal-item">
                    <div class="mobile-goal-item__tag">{{ goal.dimension }}</div>
                    <div class="mobile-goal-item__content">{{ goal.content }}</div>
                    <div class="mobile-goal-item__measure">
                      <span class="mobile-field__label">衡量方式：</span>{{ goal.measure }}
                    </div>
                    <div class="mobile-goal-item__review">
                      <span class="mobile-field__label">目标回顾：</span>{{ goal.goal_review || '暂无' }}
                    </div>
                  </div>
                </div>

                <!-- 评价摘要卡片 -->
                <div class="mobile-detail-card">
                  <div class="mobile-detail-card__title">评价摘要</div>
                  <div v-for="item in evaluationRows" :key="item.key" class="mobile-eval-item">
                    <div class="mobile-eval-item__header">
                      <span class="mobile-eval-item__type">{{ item.label }}</span>
                      <span class="mobile-eval-item__owner">{{ item.owner }}</span>
                    </div>
                    <div class="mobile-eval-item__content">{{ item.content }}</div>
                  </div>
                </div>

                <!-- 审批历史卡片 -->
                <div class="mobile-detail-card">
                  <div class="mobile-detail-card__title">审批历史</div>
                  <div v-if="!currentRecord.approval_logs.length" class="mobile-empty-inline">暂无审批历史</div>
                  <div v-for="log in currentRecord.approval_logs" :key="log.log_id" class="mobile-log-item">
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

                <!-- 审批意见卡片（待办时显示） -->
                <div v-if="activeTab === 'todo'" class="mobile-approval-action">
                  <div class="mobile-detail-card" style="margin-bottom: 0;">
                    <div class="mobile-detail-card__title">审批意见</div>
                    <a-textarea v-model:value="comment" :rows="3" placeholder="请输入审批意见，退回时必填" />
                  </div>
                  <div class="mobile-action-bar">
                    <a-button class="mobile-action-bar__btn" danger @click="rejectRecord">退回</a-button>
                    <a-button class="mobile-action-bar__btn" type="primary" @click="approveRecord">同意</a-button>
                  </div>
                </div>
              </div>
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
import { message } from 'ant-design-vue'
import { useProbationStore, type ProbationMaster } from '@/store/probation'
import { psDecisionColor, psEvalTypeLabel } from '@/views/ps/shared/PSHelpers'

const store = useProbationStore()
const activeTab = ref<'todo' | 'done'>('todo')
const currentRecord = ref<ProbationMaster | null>(null)
const detailVisible = ref(false)
const comment = ref('')
const isMobile = ref(false)

const todoList = computed(() => store.records.filter(item => item.probation_status === '08'))
const doneList = computed(() => store.records.filter(item => ['09', '10'].includes(item.probation_status) && item.approval_logs.length > 0))
const list = computed(() => activeTab.value === 'todo' ? todoList.value : doneList.value)
const todoCount = computed(() => todoList.value.length)
const doneCount = computed(() => doneList.value.length)

const evaluationRows = computed(() => {
  if (!currentRecord.value) return []
  const makeRow = (type: string, label?: string) => {
    const evalItem = currentRecord.value!.evaluations.find(item => item.eval_type === type)
    return {
      key: type,
      label: label || psEvalTypeLabel(type),
      owner: evalItem?.evaluator_name || '-',
      content: evalItem?.content || '暂无'
    }
  }
  return [makeRow('self'), makeRow('manager'), makeRow('hrbp', 'HRBP发起说明')]
})

function openDetail(record: ProbationMaster) {
  currentRecord.value = record
  comment.value = ''
  detailVisible.value = true
}

function approveRecord() {
  if (!currentRecord.value) return
  store.approveRecord(currentRecord.value.master_id, '审批人A', '二级部门负责人', comment.value || '同意转正')
  message.success('审批已通过')
  detailVisible.value = false
}

function rejectRecord() {
  if (!currentRecord.value) return
  if (!comment.value.trim()) {
    message.error('退回时请填写说明')
    return
  }
  store.rejectRecord(currentRecord.value.master_id, '审批人A', '二级部门负责人', comment.value)
  message.warning('记录已退回至评估阶段')
  detailVisible.value = false
}
</script>

<style scoped>
.ps-page__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.ps-page__header-extra {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

/* ====== 移动端容器 ====== */
.ps-page--mobile {
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

.ps-page--mobile .ps-page__header {
  padding: 12px 16px;
  background: #fff;
}

.ps-page--mobile .ps-page__title {
  font-size: 16px;
  font-weight: 600;
}

.ps-page--mobile .ps-page__subtitle {
  display: none;
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

.mobile-card__decision {
  font-size: 13px;
  font-weight: 500;
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
.ps-page--mobile :deep(.iphone-sim-modal .ant-modal) {
  top: 0;
  padding: 0;
}

.ps-page--mobile :deep(.iphone-sim-modal .ant-modal-content) {
  padding: 0;
  background: transparent;
  box-shadow: none;
  border-radius: 0;
}

.ps-page--mobile :deep(.iphone-sim-modal .ant-modal-body) {
  padding: 0 !important;
}

.ps-page--mobile :deep(.iphone-sim-modal .ant-modal-mask) {
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

/* ====== 目标项 ====== */
.mobile-goal-item {
  padding: 10px 0;
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
  font-size: 11px;
  padding: 1px 6px;
  border-radius: 3px;
  margin-bottom: 4px;
}

.mobile-goal-item__content {
  font-size: 14px;
  color: #333;
  margin-bottom: 4px;
}

.mobile-goal-item__measure,
.mobile-goal-item__review {
  font-size: 12px;
  color: #666;
  margin-top: 2px;
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

/* ====== 审批操作区（固定底部） ====== */
.mobile-approval-action {
  position: sticky;
  bottom: 0;
  background: #fff;
  padding: 12px;
  border-top: 1px solid #f0f0f0;
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.06);
  border-radius: 8px;
}

.mobile-action-bar {
  display: flex;
  gap: 12px;
  margin-top: 12px;
}

.mobile-action-bar__btn {
  flex: 1;
  height: 44px;
  font-size: 15px;
  border-radius: 6px;
}
</style>
