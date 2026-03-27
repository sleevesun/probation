<template>
  <div class="approval-page">
    <a-page-header title="审批中心" sub-title="您的待办与已办审批单据" />

    <a-tabs v-model:activeKey="activeTab">
      <a-tab-pane key="todo" tab="待我审批">
        <a-table :dataSource="todoList" :columns="columns" rowKey="master_id" bordered>
          <template #bodyCell="{ column, record }">
            <template v-if="column.dataIndex === 'dept_display'">{{ record.parent_dept }}\{{ record.dept_name }}</template>
            <template v-if="column.key === 'action'">
              <a-button type="primary" size="small" @click="openDrawer(record)">查看审批单</a-button>
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
              <a-button size="small" @click="openDrawer(record)">查看审批单</a-button>
            </template>
          </template>
        </a-table>
      </a-tab-pane>
    </a-tabs>

    <a-drawer v-model:open="drawerVisible" title="试用期转正审批单" width="860" placement="right" class="approval-drawer">
      <div v-if="currentRecord" class="approval-sheet">
        <section class="approval-sheet__section">
          <div class="approval-sheet__title">单据概览</div>
          <a-descriptions bordered size="small" :column="2">
            <a-descriptions-item label="单据标题" :span="2">关于 {{ currentRecord.emp_name }} 的试用期转正申请</a-descriptions-item>
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
            <a-table-column title="维度" data-index="dimension" />
            <a-table-column title="目标内容" data-index="content" />
            <a-table-column title="权重" :customRender="renderGoalWeight" />
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
              <a-button @click="drawerVisible = false">取消返回</a-button>
              <a-button danger @click="handleReject" :loading="saving">退回/拒绝</a-button>
              <a-button type="primary" @click="handleApprove" :loading="saving">同意</a-button>
            </a-space>
          </a-form>
        </section>
      </div>
    </a-drawer>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useProbationStore, type ProbationMaster } from '@/store/probation'
import { message } from 'ant-design-vue'

const store = useProbationStore()
const activeTab = ref('todo')

const todoList = computed(() => store.records.filter(r => r.probation_status === '08'))
const doneList = computed(() => store.records.filter(r => ['09', '10'].includes(r.probation_status) && r.approval_logs.length > 0))

const columns = [
  { title: '标题', customRender: ({ record }: any) => `关于 ${record.emp_name} 的试用期转正申请` },
  { title: '部门', dataIndex: 'dept_display', width: 180 },
  { title: '发起人', dataIndex: 'manager_name' },
  { title: '操作', key: 'action', width: 140 }
]

const doneColumns = [
  { title: '标题', customRender: ({ record }: any) => `关于 ${record.emp_name} 的试用期转正申请` },
  { title: '部门', dataIndex: 'dept_display', width: 180 },
  { title: '结论', dataIndex: 'final_decision', width: 150 },
  { title: '操作', key: 'action', width: 140 }
]

const drawerVisible = ref(false)
const currentRecord = ref<ProbationMaster | null>(null)
const approvalComment = ref('')
const saving = ref(false)

const evaluationRows = computed(() => {
  if (!currentRecord.value) return []
  return [
    formatEvalRow('员工自评', 'self'),
    formatEvalRow('直属主管评价', 'manager'),
    formatEvalRow('HRBP评价', 'hrbp')
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

function openDrawer(record: ProbationMaster) {
  currentRecord.value = record
  approvalComment.value = ''
  drawerVisible.value = true
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

function renderGoalWeight({ record }: { record: { weight: number } }) {
  return `${record.weight}%`
}

function handleApprove() {
  if (!currentRecord.value) return
  saving.value = true
  setTimeout(() => {
    store.approveRecord(currentRecord.value!.master_id, '审批人A', '二级部门负责人', approvalComment.value || '同意转正')
    message.success('已同意审批，流转至 HRBP 发布结果')
    saving.value = false
    drawerVisible.value = false
  }, 600)
}

function handleReject() {
  if (!approvalComment.value.trim()) {
    message.error('退回/拒绝必须提供审批意见')
    return
  }
  if (!currentRecord.value) return
  saving.value = true
  setTimeout(() => {
    store.rejectRecord(currentRecord.value!.master_id, '审批人A', '二级部门负责人', approvalComment.value)
    message.warning('已退回至评估阶段')
    saving.value = false
    drawerVisible.value = false
  }, 600)
}
</script>
