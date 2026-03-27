<template>
  <div class="ps-page">
    <div class="ps-page__header">
      <div>
        <div class="ps-page__title">团队试用期看板</div>
        <div class="ps-page__subtitle">主管视角下统一处理目标确认、评估提交和历史记录查询。</div>
      </div>
    </div>

    <section class="ps-panel">
      <div class="ps-toolbar">
        <span class="ps-tab" :class="{ 'ps-tab--active': activeTab === 'todo' }" @click="switchMainTab('todo')">待处理</span>
        <span class="ps-tab" :class="{ 'ps-tab--active': activeTab === 'unfinished' }" @click="switchMainTab('unfinished')">未转正</span>
        <span class="ps-tab" :class="{ 'ps-tab--active': activeTab === 'finished' }" @click="switchMainTab('finished')">已完成</span>
      </div>

      <div class="ps-filter-bar">
        <label>姓名/工号</label>
        <a-input v-model:value="searchText" size="small" style="width: 180px" />
        <label>部门</label>
        <a-select v-model:value="filterDept" allow-clear size="small" style="width: 220px">
          <a-select-option v-for="dept in deptOptions" :key="dept" :value="dept">{{ dept }}</a-select-option>
        </a-select>
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

      <table class="ps-table">
        <thead>
          <tr>
            <th>员工</th>
            <th>工号</th>
            <th>部门</th>
            <th>岗位</th>
            <th>当前状态</th>
            <th>当前处理人</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="!tableData.length">
            <td colspan="7">暂无符合条件的数据</td>
          </tr>
          <tr v-for="item in tableData" :key="item.master_id">
            <td>{{ item.emp_name }}</td>
            <td>{{ item.emp_id }}</td>
            <td>{{ item.parent_dept }}\{{ item.dept_name }}</td>
            <td>{{ item.position }}</td>
            <td>{{ getDetailedStatusText(item) }}</td>
            <td>{{ getCurrentHandler(item) }}</td>
            <td class="ps-table__actions">
              <a-button size="small" @click="openDetailModal(item)">查看详情</a-button>
              <a-button v-if="item.probation_status === '02'" size="small" type="primary" @click="openActionModal(item, 'manager-goal-review')">确认目标</a-button>
              <a-button v-if="item.probation_status === '03'" size="small" danger @click="openActionModal(item, 'manager-force-adjust')">要求调整</a-button>
              <a-button v-if="item.probation_status === '06' && !item.manager_eval_done" size="small" type="primary" @click="openActionModal(item, 'manager-evaluation')">转正评估</a-button>
            </td>
          </tr>
        </tbody>
      </table>
    </section>

    <a-modal v-model:open="detailModalVisible" title="员工转正详情" width="960px" :footer="null" wrap-class-name="ps-modal-wrap">
      <div v-if="detailModalRecord" class="ps-modal-content">
        <div class="ps-form-grid">
          <div class="ps-field"><label>员工姓名</label><div>{{ detailModalRecord.emp_name }}</div></div>
          <div class="ps-field"><label>工号</label><div>{{ detailModalRecord.emp_id }}</div></div>
          <div class="ps-field"><label>岗位</label><div>{{ detailModalRecord.position }}</div></div>
          <div class="ps-field"><label>部门</label><div>{{ detailModalRecord.parent_dept }}\{{ detailModalRecord.dept_name }}</div></div>
          <div class="ps-field"><label>当前状态</label><div>{{ getDetailedStatusText(detailModalRecord) }}</div></div>
          <div class="ps-field"><label>当前处理人</label><div>{{ getCurrentHandler(detailModalRecord) }}</div></div>
        </div>

        <div class="ps-section-title" style="margin-top: 16px">考核目标</div>
        <table class="ps-table">
          <thead><tr><th>维度</th><th>目标内容</th><th>权重</th></tr></thead>
          <tbody>
            <tr v-if="!detailModalRecord.goals.length">
              <td colspan="3">暂无目标</td>
            </tr>
            <tr v-for="goal in detailModalRecord.goals" :key="goal.goal_id">
              <td>{{ goal.dimension }}</td>
              <td>{{ goal.content }}</td>
              <td>{{ goal.weight }}%</td>
            </tr>
          </tbody>
        </table>

        <div class="ps-section-title" style="margin-top: 16px">评价记录</div>
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
      </div>
    </a-modal>

    <a-modal v-model:open="actionModalVisible" :title="actionModalTitle" width="960px" :footer="null" wrap-class-name="ps-modal-wrap">
      <div v-if="actionModalRecord" class="ps-modal-content">
        <template v-if="actionModalType === 'manager-goal-review'">
          <div class="ps-form-grid">
            <div class="ps-field"><label>员工姓名</label><div>{{ actionModalRecord.emp_name }}</div></div>
            <div class="ps-field"><label>岗位</label><div>{{ actionModalRecord.position }}</div></div>
            <div class="ps-field"><label>部门</label><div>{{ actionModalRecord.parent_dept }}\{{ actionModalRecord.dept_name }}</div></div>
            <div class="ps-field"><label>入职日期</label><div>{{ actionModalRecord.hire_date }}</div></div>
          </div>
          <div class="ps-section-title" style="margin-top: 16px">目标明细</div>
          <table class="ps-table">
            <thead><tr><th>维度</th><th>目标内容</th><th>权重</th></tr></thead>
            <tbody>
              <tr v-for="goal in actionModalRecord.goals" :key="goal.goal_id">
                <td>{{ goal.dimension }}</td>
                <td>{{ goal.content }}</td>
                <td>{{ goal.weight }}%</td>
              </tr>
            </tbody>
          </table>
          <div class="ps-section-title" style="margin-top: 16px">退回意见</div>
          <a-textarea v-model:value="rejectComment" :rows="4" placeholder="如需退回修改，请填写退回意见" />
          <div class="ps-toolbar" style="margin-top: 16px">
            <div class="ps-toolbar__spacer"></div>
            <a-button size="small" @click="closeActionModal">取消</a-button>
            <a-button size="small" danger :disabled="!rejectComment.trim()" @click="handleReject">退回修改</a-button>
            <a-button size="small" type="primary" @click="handleConfirm">同意锁定</a-button>
          </div>
        </template>

        <template v-if="actionModalType === 'manager-force-adjust'">
          <div class="ps-alert ps-alert--warning">该员工目标已确认，执行后将退回至待设定目标阶段。</div>
          <div class="ps-form-grid" style="margin-top: 16px">
            <div class="ps-field"><label>员工姓名</label><div>{{ actionModalRecord.emp_name }}</div></div>
            <div class="ps-field"><label>当前状态</label><div>{{ getDetailedStatusText(actionModalRecord) }}</div></div>
          </div>
          <div class="ps-section-title" style="margin-top: 16px">调整原因</div>
          <a-textarea v-model:value="rejectComment" :rows="4" placeholder="请填写要求调整的原因" />
          <div class="ps-toolbar" style="margin-top: 16px">
            <div class="ps-toolbar__spacer"></div>
            <a-button size="small" @click="closeActionModal">取消</a-button>
            <a-button size="small" danger :disabled="!rejectComment.trim()" @click="handleForceAdjust">确认退回</a-button>
          </div>
        </template>

        <template v-if="actionModalType === 'manager-evaluation'">
          <div class="ps-form-grid">
            <div class="ps-field"><label>员工姓名</label><div>{{ actionModalRecord.emp_name }}</div></div>
            <div class="ps-field"><label>岗位</label><div>{{ actionModalRecord.position }}</div></div>
            <div class="ps-field"><label>部门</label><div>{{ actionModalRecord.parent_dept }}\{{ actionModalRecord.dept_name }}</div></div>
            <div class="ps-field"><label>当前状态</label><div>{{ getDetailedStatusText(actionModalRecord) }}</div></div>
          </div>
          <div class="ps-section-title" style="margin-top: 16px">目标内容</div>
          <table class="ps-table">
            <thead><tr><th>维度</th><th>内容</th><th>权重</th></tr></thead>
            <tbody>
              <tr v-for="goal in actionModalRecord.goals" :key="goal.goal_id">
                <td>{{ goal.dimension }}</td>
                <td>{{ goal.content }}</td>
                <td>{{ goal.weight }}%</td>
              </tr>
            </tbody>
          </table>
          <div class="ps-section-title" style="margin-top: 16px">已有评价</div>
          <table class="ps-table">
            <thead><tr><th>类型</th><th>评价人</th><th>内容</th><th>时间</th></tr></thead>
            <tbody>
              <tr v-if="!actionModalRecord.evaluations.length">
                <td colspan="4">暂无评价记录</td>
              </tr>
              <tr v-for="item in actionModalRecord.evaluations" :key="item.eval_id">
                <td>{{ evalTypeText(item.eval_type) }}</td>
                <td>{{ item.evaluator_name }}</td>
                <td>{{ item.content }}</td>
                <td>{{ item.create_time }}</td>
              </tr>
            </tbody>
          </table>
          <div class="ps-filter-bar" style="margin-top: 16px">
            <label>结论</label>
            <a-radio-group v-model:value="decision">
              <a-radio value="超出预期">超出预期</a-radio>
              <a-radio value="符合预期">符合预期</a-radio>
              <a-radio value="不符合录用条件">不符合录用条件</a-radio>
            </a-radio-group>
          </div>
          <a-textarea v-model:value="reason" :rows="5" placeholder="填写主管评估意见" />
          <div class="ps-toolbar" style="margin-top: 16px">
            <div class="ps-toolbar__spacer"></div>
            <a-button size="small" @click="closeActionModal">取消</a-button>
            <a-button size="small" type="primary" @click="handleSubmitEvaluation">提交评估</a-button>
          </div>
        </template>
      </div>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { message } from 'ant-design-vue'
import { useProbationStore, getCurrentHandler, getDetailedStatusText, type ProbationMaster } from '@/store/probation'

type MainTab = 'todo' | 'unfinished' | 'finished'
type StageFilter = '01' | '02_03' | '04' | '05' | '06' | '08' | '09'
type ActionModalType = 'manager-goal-review' | 'manager-force-adjust' | 'manager-evaluation'

const store = useProbationStore()

const activeTab = ref<MainTab>('todo')
const searchText = ref('')
const filterDept = ref<string>()
const activeStageFilters = ref<StageFilter[]>([])

const detailModalVisible = ref(false)
const detailModalRecord = ref<ProbationMaster | null>(null)
const actionModalVisible = ref(false)
const actionModalType = ref<ActionModalType>('manager-goal-review')
const actionModalRecord = ref<ProbationMaster | null>(null)

const rejectComment = ref('')
const decision = ref<'超出预期' | '符合预期' | '不符合录用条件'>('符合预期')
const reason = ref('')

const stageOptions = [
  { value: '01', label: '待设定目标' },
  { value: '02_03', label: '已设定目标' },
  { value: '04', label: '待发起流程' },
  { value: '05', label: '待员工自评' },
  { value: '06', label: '待评估' },
  { value: '08', label: '审批中' },
  { value: '09', label: '待发布' }
] satisfies { value: StageFilter; label: string }[]

const deptOptions = computed(() => Array.from(new Set(store.records.map(item => `${item.parent_dept}\\${item.dept_name}`))))

const tableData = computed(() => {
  let list = store.records

  if (activeTab.value === 'todo') {
    list = list.filter(item => item.probation_status === '02' || (item.probation_status === '06' && !item.manager_eval_done))
  } else if (activeTab.value === 'unfinished') {
    list = list.filter(item => item.probation_status !== '10')
    if (activeStageFilters.value.length > 0) {
      list = list.filter(item => matchesStage(item, activeStageFilters.value))
    }
  } else {
    list = list.filter(item => item.probation_status === '10')
  }

  if (searchText.value) {
    const keyword = searchText.value.toLowerCase()
    list = list.filter(item => item.emp_name.toLowerCase().includes(keyword) || item.emp_id.toLowerCase().includes(keyword))
  }

  if (filterDept.value) {
    list = list.filter(item => `${item.parent_dept}\\${item.dept_name}` === filterDept.value)
  }

  return list
})

const actionModalTitle = computed(() => {
  if (actionModalType.value === 'manager-goal-review') return '目标审核'
  if (actionModalType.value === 'manager-force-adjust') return '要求调整'
  return '转正评估'
})

function matchesStage(record: ProbationMaster, stages: StageFilter[]) {
  return stages.some(stage => {
    if (stage === '02_03') return ['02', '03'].includes(record.probation_status)
    return record.probation_status === stage
  })
}

function evalTypeText(type: string) {
  const map: Record<string, string> = {
    self: '员工自评',
    manager: '直属主管评价',
    hrbp: 'HRBP评价',
    invited: '邀请评议'
  }
  return map[type] || type
}

function switchMainTab(tab: MainTab) {
  activeTab.value = tab
  if (tab !== 'unfinished') {
    activeStageFilters.value = []
  }
}

function resetFilters() {
  searchText.value = ''
  filterDept.value = undefined
  activeStageFilters.value = []
}

function openDetailModal(record: ProbationMaster) {
  detailModalRecord.value = record
  detailModalVisible.value = true
}

function openActionModal(record: ProbationMaster, type: ActionModalType) {
  actionModalRecord.value = record
  actionModalType.value = type
  actionModalVisible.value = true
  rejectComment.value = ''
  reason.value = ''
  decision.value = '符合预期'
}

function closeActionModal() {
  actionModalVisible.value = false
  actionModalRecord.value = null
}

function handleConfirm() {
  if (!actionModalRecord.value) return
  store.confirmGoals(actionModalRecord.value.master_id)
  message.success('已同意锁定目标')
  closeActionModal()
}

function handleReject() {
  if (!actionModalRecord.value || !rejectComment.value.trim()) return
  store.returnGoals(actionModalRecord.value.master_id, rejectComment.value)
  message.warning('目标已退回修改')
  closeActionModal()
}

function handleForceAdjust() {
  if (!actionModalRecord.value || !rejectComment.value.trim()) return
  store.returnGoals(actionModalRecord.value.master_id, rejectComment.value)
  message.warning('已要求员工重新调整目标')
  closeActionModal()
}

function handleSubmitEvaluation() {
  if (!actionModalRecord.value) return
  if (decision.value === '不符合录用条件' && !reason.value.trim()) {
    message.error('不符合录用条件时必须填写说明')
    return
  }
  store.submitManagerEval(actionModalRecord.value.master_id, reason.value || '主管评估通过', decision.value)
  message.success('主管评估已提交')
  closeActionModal()
}
</script>
