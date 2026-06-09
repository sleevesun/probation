<template>
  <div class="ps-page">
    <div class="ps-page__header">
      <div>
        <div class="ps-page__title">试用期管理</div>
        <div class="ps-page__subtitle">参考 PeopleSoft 列表页，以查询区、页签、传统表格和弹窗作为核心交互。</div>
      </div>
    </div>

    <section class="ps-panel">
      <div class="ps-toolbar">
        <span class="ps-tab" :class="{ 'ps-tab--active': activeTab === 'unfinished' }" @click="switchMainTab('unfinished')">未转正</span>
        <span class="ps-tab" :class="{ 'ps-tab--active': activeTab === 'finished' }" @click="switchMainTab('finished')">已结束</span>
      </div>

      <div class="ps-filter-bar">
        <a-checkbox v-if="activeTab === 'unfinished'" v-model:checked="onlyMyTodo">待我处理</a-checkbox>
        <label>姓名/工号</label>
        <a-input v-model:value="searchText" size="small" style="width: 180px" />
        <label>部门</label>
        <a-tree-select
          v-model:value="filterDept"
          :tree-data="deptTreeData"
          tree-checkable
          multiple
          :show-checked-strategy="TreeSelect.SHOW_CHILD"
          placeholder="全部部门"
          allow-clear
          size="small"
          style="width: 280px"
        />
        <template v-if="activeTab === 'unfinished'">
          <label>流程环节</label>
          <a-select
            v-model:value="activeStageFilters"
            mode="multiple"
            allow-clear
            size="small"
            class="ps-stage-select"
            :options="stageOptions"
            placeholder="全部"
          />
        </template>
        <a-button size="small" @click="resetFilters">重置</a-button>
      </div>

      <table class="ps-table panorama-main-table">
        <thead>
          <tr>
            <th>员工ID</th>
            <th>姓名</th>
            <th>直属部门</th>
            <th>入职时长</th>
            <th>当前状态</th>
            <th>当前处理人</th>
            <th>查看详情</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="!rows.length">
            <td colspan="8">暂无符合条件的数据</td>
          </tr>
          <tr v-for="item in rows" :key="item.master_id">
            <td>{{ item.emp_id }}</td>
            <td>{{ item.emp_name }}</td>
            <td>{{ item.parent_dept }}\{{ item.dept_name }}</td>
            <td><span :style="parseFloat(getMonthsSinceHire(item.hire_date)) > 6 ? 'color: #ff4d4f; font-weight: 500' : ''">{{ getMonthsSinceHire(item.hire_date) }} 个月</span></td>
            <td>{{ getDetailedStatusText(item) }}</td>
            <td>{{ getCurrentHandler(item) }}</td>
            <td class="ps-table__detail">
              <a-button size="small" @click="openDetailModal(item)">查看详情</a-button>
            </td>
            <td class="ps-table__actions">
              <template v-if="!item.terminated">
                <a-button v-if="canTriggerProbation(item)" size="small" type="primary" @click="handleTriggerConfirm(item)">开启评价</a-button>
                <a-button v-if="['01','02','03','04'].includes(item.probation_status)" size="small" danger @click="openActionModal(item, 'hrbp-hold')">终止转正</a-button>
                <a-button v-if="['05','06'].includes(item.probation_status)" size="small" danger @click="handleTerminate(item.master_id)">终止转正</a-button>
                <a-button v-if="item.probation_status === '07'" size="small" type="primary" @click="openApprovalPreview(item)">发起转正</a-button>
                <a-button v-if="item.probation_status === '07'" size="small" danger @click="handleTerminate(item.master_id)">终止转正</a-button>
              </template>
              <span v-else style="color: #999; font-size: 12px">已终止</span>
            </td>
          </tr>
        </tbody>
      </table>
    </section>

    <a-modal v-model:open="detailModalVisible" title="员工转正详情" width="1080px" :footer="null" wrap-class-name="ps-modal-wrap">
      <div v-if="detailModalRecord" class="ps-modal-content">
        <div class="ps-form-grid">
          <div class="ps-field"><label>姓名</label><div>{{ detailModalRecord.emp_name }}</div></div>
          <div class="ps-field"><label>员工ID</label><div>{{ detailModalRecord.emp_id }}</div></div>
          <div class="ps-field"><label>公司资历日期</label><div>{{ detailModalRecord.hire_date }}</div></div>
          <div class="ps-field"><label>直属上级</label><div>{{ detailModalRecord.manager_name }}</div></div>
          <div class="ps-field"><label>当前状态</label><div>{{ getDetailedStatusText(detailModalRecord) }}</div></div>
          <div class="ps-field"><label>当前处理人</label><div>{{ getCurrentHandler(detailModalRecord) }}</div></div>
        </div>

        <div class="ps-alert ps-alert--warning" style="margin-top: 16px" v-if="detailRecordOverSixMonths">该员工试用期已超过 6 个月，请关注结果发布时间。</div>

        <div class="ps-section-title" style="margin-top: 16px">目标信息</div>
        <table class="ps-table">
          <thead><tr><th style="width: 60px">序号</th><th>目标内容</th><th>预期结果</th></tr></thead>
          <tbody>
            <tr v-if="!detailModalRecord.goals.length">
              <td colspan="3">暂无目标</td>
            </tr>
            <tr v-for="(goal, idx) in detailModalRecord.goals" :key="goal.goal_id">
              <td style="text-align: center">{{ idx + 1 }}</td>
              <td>{{ goal.content }}</td>
              <td>{{ goal.measure }}</td>
            </tr>
          </tbody>
        </table>

        <div class="ps-section-title" style="margin-top: 16px">目标与评价记录</div>
        <table class="ps-table">
          <thead><tr><th>类型</th><th>评价人</th><th>内容</th><th>时间</th></tr></thead>
          <tbody>
            <tr v-if="!detailModalRecord.evaluations.length">
              <td colspan="4">暂无评价记录</td>
            </tr>
            <tr v-for="item in detailModalRecord.evaluations" :key="item.eval_id">
              <td>{{ evalTypeText(item.eval_type) }}</td>
              <td>{{ item.evaluator_name }}</td>
              <td>{{ item.content }}</td>
              <td>{{ item.create_time }}</td>
            </tr>
          </tbody>
        </table>

        <!-- 审批记录 -->
        <div v-if="['08', '09', '10'].includes(detailModalRecord.probation_status)" class="approval-records-section">
          <div class="approval-records-title">审批记录</div>
          <div v-if="detailModalRecord.approval_logs && detailModalRecord.approval_logs.length > 0">
            <div v-for="log in detailModalRecord.approval_logs" :key="log.log_id" class="approval-record-item">
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

    <a-modal v-model:open="actionModalVisible" :title="actionModalTitle" width="1080px" :footer="null" wrap-class-name="ps-modal-wrap">
      <div v-if="actionModalRecord" class="ps-modal-content">
        <div class="ps-form-grid">
          <div class="ps-field"><label>姓名</label><div>{{ actionModalRecord.emp_name }}</div></div>
          <div class="ps-field"><label>员工ID</label><div>{{ actionModalRecord.emp_id }}</div></div>
          <div class="ps-field"><label>部门</label><div>{{ actionModalRecord.parent_dept }}\{{ actionModalRecord.dept_name }}</div></div>
          <div class="ps-field"><label>当前状态</label><div>{{ getDetailedStatusText(actionModalRecord) }}</div></div>
        </div>

        <template v-if="actionModalType === 'hrbp-trigger'">
          <div class="ps-alert ps-alert--info" style="margin-top: 16px">确认后将开启该员工的试用期评价。</div>
          <div class="ps-toolbar" style="margin-top: 16px">
            <div class="ps-toolbar__spacer"></div>
            <a-button size="small" @click="closeActionModal">返回</a-button>
            <a-button size="small" type="primary" @click="handleTrigger">确认开启</a-button>
          </div>
        </template>

        <template v-if="actionModalType === 'hrbp-hold'">
          <div class="ps-alert ps-alert--warning" style="margin-top: 16px">该操作将直接关闭该员工的试用期流程，是否确认？</div>
          <div class="ps-toolbar" style="margin-top: 16px">
            <div class="ps-toolbar__spacer"></div>
            <a-button size="small" @click="closeActionModal">取消</a-button>
            <a-button size="small" danger @click="handleHold">确认终止</a-button>
          </div>
        </template>
      </div>
    </a-modal>

    <!-- 审批单预览 Modal -->
    <a-modal v-model:open="approvalPreviewVisible" title="转正审批单预览" width="1080px" :footer="null" wrap-class-name="ps-modal-wrap">
      <div v-if="approvalPreviewRecord" class="ps-modal-content">
        <div class="ps-form-grid">
          <div class="ps-field"><label>姓名</label><div>{{ approvalPreviewRecord.emp_name }}</div></div>
          <div class="ps-field"><label>员工ID</label><div>{{ approvalPreviewRecord.emp_id }}</div></div>
          <div class="ps-field"><label>部门</label><div>{{ approvalPreviewRecord.parent_dept }}\{{ approvalPreviewRecord.dept_name }}</div></div>
          <div class="ps-field"><label>入职日期</label><div>{{ approvalPreviewRecord.hire_date }}</div></div>
          <div class="ps-field"><label>直属上级</label><div>{{ approvalPreviewRecord.manager_name }}</div></div>
          <div class="ps-field"><label>上级评价结果</label><div>{{ formatDecisionLabel(approvalPreviewRecord.final_decision) }}</div></div>
        </div>

        <!-- 试用期目标 -->
        <div class="approval-detail-section" style="margin-top: 16px">
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

        <!-- 阶段性反馈 -->
        <div class="approval-detail-section" style="margin-top: 16px">
          <div class="approval-detail-section__title">阶段性反馈</div>
          <div v-if="(approvalPreviewRecord.stage_evaluations || []).length > 0">
            <div class="approval-detail-item" v-for="stageEval in approvalPreviewRecord.stage_evaluations || []" :key="stageEval.stage_eval_id">
              <div class="approval-detail-item__title">{{ stageEval.evaluator_name }}-{{ stageEval.evaluator_role }} {{ stageEval.create_time }}</div>
              <div class="approval-detail-item__content">{{ stageEval.content }}</div>
            </div>
          </div>
          <a-empty v-else description="暂无阶段性反馈记录" :image-style="{ height: '40px' }" />
        </div>

        <!-- 员工自评 -->
        <div class="approval-detail-section" style="margin-top: 16px">
          <div class="approval-detail-section__title">员工自评</div>
          <div v-if="approvalSelfEval" class="approval-detail-section__content">{{ approvalSelfEval.content }}</div>
          <a-empty v-else description="暂无自评" :image-style="{ height: '40px' }" />
        </div>

        <!-- 上级评价 -->
        <div class="approval-detail-section" style="margin-top: 16px">
          <div class="approval-detail-section__title">上级评价</div>
          <div v-if="approvalManagerEval" class="approval-detail-section__content">
            <div><strong>评价结果：</strong>{{ approvalManagerEvalResultText }}</div>
            <div style="margin-top: 8px;">{{ approvalManagerEvalContentText }}</div>
          </div>
          <a-empty v-else description="暂无上级评价" :image-style="{ height: '40px' }" />
        </div>

        <div style="margin-top: 16px">
          <label style="display: block; margin-bottom: 4px; font-weight: 500;">备注说明</label>
          <a-textarea v-model:value="approvalRemark" :rows="3" placeholder="可填写转正说明或备注信息" />
        </div>

        <div class="ps-toolbar" style="margin-top: 16px">
          <div class="ps-toolbar__spacer"></div>
          <a-button size="small" @click="approvalPreviewVisible = false">取消</a-button>
          <a-button size="small" type="primary" @click="submitApproval">发起转正</a-button>
        </div>
      </div>
    </a-modal>

    <!-- 阶段性反馈弹窗 -->
    <a-modal v-model:open="stageEvalModalVisible" title="填写阶段性反馈" width="700px" :footer="null" wrap-class-name="ps-modal-wrap">
      <div v-if="stageEvalRecord" class="ps-modal-content">
        <div class="ps-form-grid">
          <div class="ps-field"><label>员工姓名</label><div>{{ stageEvalRecord.emp_name }}</div></div>
          <div class="ps-field"><label>岗位</label><div>{{ stageEvalRecord.position }}</div></div>
          <div class="ps-field"><label>部门</label><div>{{ stageEvalRecord.parent_dept }}\{{ stageEvalRecord.dept_name }}</div></div>
          <div class="ps-field"><label>入职日期</label><div>{{ stageEvalRecord.hire_date }}</div></div>
        </div>
        <div class="ps-section-title" style="margin-top: 16px">目标信息</div>
        <table v-if="stageEvalRecord.goals.length > 0" class="ps-table">
          <thead><tr><th style="width: 60px">序号</th><th>目标内容</th><th>预期结果</th></tr></thead>
          <tbody>
            <tr v-for="(goal, idx) in stageEvalRecord.goals" :key="goal.goal_id">
              <td style="text-align: center">{{ Number(idx) + 1 }}</td>
              <td>{{ goal.content }}</td>
              <td>{{ goal.measure }}</td>
            </tr>
          </tbody>
        </table>
        <a-alert v-else type="info" message="暂未完成试用期目标制定" style="margin-top: 8px" />
        <div class="ps-section-title" style="margin-top: 16px">历史阶段性反馈</div>
        <table v-if="(stageEvalRecord.stage_evaluations || []).length > 0" class="ps-table">
          <thead><tr><th>填写人</th><th>角色</th><th>评价内容</th><th>时间</th></tr></thead>
          <tbody>
            <tr v-for="item in stageEvalRecord.stage_evaluations" :key="item.stage_eval_id">
              <td>{{ item.evaluator_name }}</td>
              <td>{{ item.evaluator_role }}</td>
              <td style="white-space: pre-wrap">{{ item.content }}</td>
              <td>{{ item.create_time }}</td>
            </tr>
          </tbody>
        </table>
        <a-empty v-else description="暂无阶段性反馈记录" style="margin-top: 8px" />
        <div class="ps-section-title" style="margin-top: 16px">评价内容</div>
        <a-textarea v-model:value="stageEvalContent" :rows="4" placeholder="请输入阶段性反馈内容" />
        <div class="ps-toolbar" style="margin-top: 16px">
          <div class="ps-toolbar__spacer"></div>
          <a-button size="small" @click="stageEvalModalVisible = false">取消</a-button>
          <a-button size="small" type="primary" @click="handleStageEvalSubmit" :disabled="!stageEvalContent.trim()">提交评价</a-button>
        </div>
      </div>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { message, Modal, TreeSelect } from 'ant-design-vue'
import { useProbationStore, getCurrentHandler, getDetailedStatusText, getMonthsSinceHire, canTriggerProbation, formatDecisionLabel, type ProbationMaster } from '@/store/probation'

type MainTab = 'todo' | 'unfinished' | 'finished'
type StageFilter = 'goal_setting' | 'probation_eval' | 'approval'
type ActionModalType = 'hrbp-trigger' | 'hrbp-hold' | 'hrbp-publish'

const store = useProbationStore()

const activeTab = ref<MainTab>('unfinished')
const activeStageFilters = ref<StageFilter[]>([])
const searchText = ref('')
const filterDept = ref<string[]>([])
const onlyMyTodo = ref(false)

const detailModalVisible = ref(false)
const detailModalRecord = ref<ProbationMaster | null>(null)
const actionModalVisible = ref(false)
const actionModalType = ref<ActionModalType>('hrbp-trigger')
const actionModalRecord = ref<ProbationMaster | null>(null)
const allowEmployeeView = ref(false)

// Approval preview
const approvalPreviewVisible = ref(false)
const approvalPreviewRecord = ref<ProbationMaster | null>(null)
const approvalRemark = ref('')
const approvalSelfEval = computed(() => approvalPreviewRecord.value?.evaluations.find(e => e.eval_type === 'self'))
const approvalManagerEval = computed(() => approvalPreviewRecord.value?.evaluations.find(e => e.eval_type === 'manager'))

const normalizeEvalContent = (content?: string, decision?: string) => {
  if (!content) return '暂无'
  const label = formatDecisionLabel(decision)
  const normalized = content.trim()
  if (label !== '-' && normalized.startsWith(label)) {
    return normalized.slice(label.length).replace(/^\s*[-－—]\s*/, '') || normalized
  }
  return normalized.replace(/^(超出预期|符合预期|不符合转正条件|不通过)\s*[-－—]\s*/, '')
}
const approvalManagerEvalResultText = computed(() => formatDecisionLabel(approvalPreviewRecord.value?.final_decision))
const approvalManagerEvalContentText = computed(() => normalizeEvalContent(approvalManagerEval.value?.content, approvalPreviewRecord.value?.final_decision))

const stageOptions = [
  { value: 'goal_setting', label: '目标设定' },
  { value: 'probation_eval', label: '试用期评价' },
  { value: 'approval', label: '转正审批' }
] satisfies { value: StageFilter; label: string }[]

const deptTreeData = computed(() => {
  const treeMap = new Map<string, Set<string>>()
  store.records.forEach(r => {
    if (!treeMap.has(r.parent_dept)) treeMap.set(r.parent_dept, new Set())
    treeMap.get(r.parent_dept)!.add(r.dept_name)
  })
  return Array.from(treeMap.entries()).map(([parent, children]) => ({
    title: parent,
    value: parent,
    children: Array.from(children).map(child => ({
      title: child,
      value: `${parent}\\${child}`
    }))
  }))
})

const rows = computed(() => {
  let list = store.records

  if (activeTab.value === 'unfinished') {
    list = list.filter(item => !['10', '88'].includes(item.probation_status) && item.business_title !== '残疾人')
    // 待我处理筛选
    if (onlyMyTodo.value) {
      list = list.filter(item => ['03', '04', '07'].includes(item.probation_status))
    }
    if (activeStageFilters.value.length > 0) {
      list = list.filter(item => matchesStage(item, activeStageFilters.value))
    }
  } else {
    list = list.filter(item => ['10', '88'].includes(item.probation_status) && item.business_title !== '残疾人')
  }

  if (searchText.value) {
    const keyword = searchText.value.toLowerCase()
    list = list.filter(item => item.emp_name.toLowerCase().includes(keyword) || item.emp_id.toLowerCase().includes(keyword))
  }

  if (filterDept.value.length > 0) {
    list = list.filter(item => filterDept.value.includes(item.parent_dept) || filterDept.value.includes(`${item.parent_dept}\\${item.dept_name}`))
  }

  if (activeTab.value !== 'finished') {
    list = [...list].sort((a, b) => getPriority(a) - getPriority(b) || new Date(a.hire_date).getTime() - new Date(b.hire_date).getTime())
  }

  return list
})

const actionModalTitle = computed(() => {
  if (actionModalType.value === 'hrbp-trigger') return '开启评价'
  if (actionModalType.value === 'hrbp-hold') return '终止转正'
  return '发布结果'
})

const detailRecordOverSixMonths = computed(() => detailModalRecord.value ? parseFloat(getMonthsSinceHire(detailModalRecord.value.hire_date)) >= 6 : false)

function getPriority(record: ProbationMaster) {
  if (record.probation_status === '04') return 0
  if (record.probation_status === '07') return 0
  if (record.probation_status === '09') return 1
  return 2
}

function matchesStage(record: ProbationMaster, stages: StageFilter[]) {
  return stages.some(stage => {
    if (stage === 'goal_setting') return ['01', '02', '03', '04'].includes(record.probation_status)
    if (stage === 'probation_eval') return ['05', '06', '07'].includes(record.probation_status)
    if (stage === 'approval') return ['08', '09'].includes(record.probation_status)
    return false
  })
}

function evalTypeText(type: string) {
  const map: Record<string, string> = {
    self: '员工自评',
    manager: '直属上级评价',
    hrbp: 'HRBP评价',
    invited: '邀请评议'
  }
  return map[type] || type
}

function switchMainTab(tab: MainTab) {
  activeTab.value = tab
  if (tab !== 'unfinished') activeStageFilters.value = []
}

function resetFilters() {
  searchText.value = ''
  filterDept.value = []
  activeStageFilters.value = []
  onlyMyTodo.value = false
}

function openDetailModal(record: ProbationMaster) {
  detailModalRecord.value = record
  detailModalVisible.value = true
}

function openActionModal(record: ProbationMaster, type: ActionModalType) {
  actionModalRecord.value = record
  actionModalType.value = type
  actionModalVisible.value = true
  allowEmployeeView.value = false
}

function closeActionModal() {
  actionModalVisible.value = false
  actionModalRecord.value = null
}

function handleTrigger() {
  if (!actionModalRecord.value) return
  store.triggerProbation(actionModalRecord.value.master_id)
  message.success('已开启评价')
  closeActionModal()
}

function handleTriggerConfirm(record: ProbationMaster) {
  Modal.confirm({
    title: '确认开启评价',
    content: '确认后将通知该员工开始填写试用期自评。',
    onOk: () => {
      store.triggerProbation(record.master_id)
      message.success('已开启评价')
    }
  })
}

function handleHold() {
  if (!actionModalRecord.value) return
  store.holdProbation(actionModalRecord.value.master_id)
  message.warning('员工试用期评估结果为【不通过并终止试用期】，流程已结束')
  closeActionModal()
}

function openApprovalPreview(record: ProbationMaster) {
  approvalPreviewRecord.value = record
  approvalRemark.value = ''
  approvalPreviewVisible.value = true
}

function submitApproval() {
  if (!approvalPreviewRecord.value) return
  store.triggerApproval(approvalPreviewRecord.value.master_id)
  message.success('已发起转正')
  approvalPreviewVisible.value = false
}

function handleTerminate(masterId: string) {
  Modal.confirm({
    title: '确认终止试用期',
    content: '该操作将直接关闭该员工的试用期流程，是否确认？',
    width: 560,
    class: 'terminate-confirm-modal',
    okText: '确认终止',
    okType: 'danger',
    cancelText: '取消',
    onOk: () => { store.holdProbation(masterId); message.warning('员工试用期评估结果为【不通过并终止试用期】，流程已结束') }
  })
}

// 阶段性反馈弹窗
const stageEvalModalVisible = ref(false)
const stageEvalRecord = ref<any>(null)
const stageEvalContent = ref('')

function handleStageEvalSubmit() {
  if (!stageEvalRecord.value || !stageEvalContent.value.trim()) return
  store.addStageEvaluation(stageEvalRecord.value.master_id, '刘建国', stageEvalContent.value)
  message.success('阶段性反馈已提交')
  stageEvalModalVisible.value = false
  stageEvalContent.value = ''
}
</script>

<style scoped>
/* B4-PS-LIST-001: 主列表表格改为按内容自适应列宽 */
.panorama-main-table {
  table-layout: auto;
}

/* 员工ID — 短字段，紧凑 */
.panorama-main-table th:nth-child(1),
.panorama-main-table td:nth-child(1) {
  width: 80px;
  min-width: 70px;
  max-width: 100px;
}

/* 姓名 — 短字段，紧凑 */
.panorama-main-table th:nth-child(2),
.panorama-main-table td:nth-child(2) {
  width: 70px;
  min-width: 60px;
  max-width: 90px;
}

/* 直属部门 — 内容较长，给予更多空间 */
.panorama-main-table th:nth-child(3),
.panorama-main-table td:nth-child(3) {
  min-width: 150px;
}

/* 资历日期 */
.panorama-main-table th:nth-child(4),
.panorama-main-table td:nth-child(4) {
  width: 100px;
  min-width: 90px;
  max-width: 120px;
}

/* 当前状态 — 内容较长 */
.panorama-main-table th:nth-child(5),
.panorama-main-table td:nth-child(5) {
  min-width: 120px;
}

/* 当前处理人 */
.panorama-main-table th:nth-child(6),
.panorama-main-table td:nth-child(6) {
  width: 80px;
  min-width: 70px;
  max-width: 100px;
}

/* B4-PS-LIST-002: 查看详情 — 独立列，紧凑居中 */
.panorama-main-table th:nth-child(7),
.panorama-main-table td:nth-child(7) {
  width: 80px;
  min-width: 70px;
  max-width: 90px;
  text-align: center;
}

/* 操作列 */
.panorama-main-table th:nth-child(8),
.panorama-main-table td:nth-child(8) {
  min-width: 200px;
}

/* 查看详情单元格居中对齐 */
.ps-table__detail {
  text-align: center;
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
</style>
