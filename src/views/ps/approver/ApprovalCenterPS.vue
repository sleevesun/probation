<template>
  <div class="ps-page">
    <div class="ps-page__header">
      <div>
        <div class="ps-page__title">审批中心</div>
        <div class="ps-page__subtitle">以 PeopleSoft 风格展示待审批列表与审批单详情。</div>
      </div>
    </div>

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

    <a-modal v-model:open="detailVisible" title="试用期转正审批单" width="980px" :footer="null" wrap-class-name="ps-modal-wrap">
      <div v-if="currentRecord" class="ps-modal-content">
        <div class="ps-sheet">
          <section class="ps-sheet__section">
            <div class="ps-section-title">单据概览</div>
            <div class="ps-form-grid">
              <div class="ps-field"><label>单据标题</label><div>关于 {{ currentRecord.emp_name }} 的试用期转正申请</div></div>
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

const list = computed(() => activeTab.value === 'todo'
  ? store.records.filter(item => item.probation_status === '08')
  : store.records.filter(item => ['09', '10'].includes(item.probation_status) && item.approval_logs.length > 0)
)

const evaluationRows = computed(() => {
  if (!currentRecord.value) return []
  const makeRow = (type: string) => {
    const evalItem = currentRecord.value!.evaluations.find(item => item.eval_type === type)
    return {
      key: type,
      label: psEvalTypeLabel(type),
      owner: evalItem?.evaluator_name || '-',
      content: evalItem?.content || '暂无'
    }
  }
  return [makeRow('self'), makeRow('manager'), makeRow('hrbp')]
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
