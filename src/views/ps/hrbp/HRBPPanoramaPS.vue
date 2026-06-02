<template>
  <div class="ps-page">
    <div class="ps-page__header">
      <div>
        <div class="ps-page__title">HRG转正管理</div>
        <div class="ps-page__subtitle">参考 PeopleSoft 列表页，以查询区、页签、传统表格和弹窗作为核心交互。</div>
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
            <th>员工ID</th>
            <th>姓名</th>
            <th>直属部门</th>
            <th>资历日期</th>
            <th>当前状态</th>
            <th>当前处理人</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="!rows.length">
            <td colspan="7">暂无符合条件的数据</td>
          </tr>
          <tr v-for="item in rows" :key="item.master_id">
            <td>{{ item.emp_id }}</td>
            <td>{{ item.emp_name }}</td>
            <td>{{ item.parent_dept }}\{{ item.dept_name }}</td>
            <td>{{ item.hire_date }}</td>
            <td>{{ getDetailedStatusText(item) }}</td>
            <td>{{ getCurrentHandler(item) }}</td>
            <td class="ps-table__actions">
              <a-button size="small" @click="openDetailModal(item)">查看详情</a-button>
              <a-button v-if="item.probation_status === '04'" size="small" type="primary" @click="openActionModal(item, 'hrbp-trigger')">发起转正流程</a-button>
              <a-button v-if="item.probation_status === '04'" size="small" danger @click="openActionModal(item, 'hrbp-hold')">暂不发起</a-button>
              <a-button v-if="item.probation_status === '07'" size="small" type="primary" @click="openActionModal(item, 'hrbp-approval')">发起审批</a-button>
              <a-button v-if="item.probation_status === '09'" size="small" @click="openActionModal(item, 'hrbp-publish')">发布结果</a-button>
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
          <div class="ps-field"><label>直属主管</label><div>{{ detailModalRecord.manager_name }}</div></div>
          <div class="ps-field"><label>当前状态</label><div>{{ getDetailedStatusText(detailModalRecord) }}</div></div>
          <div class="ps-field"><label>当前处理人</label><div>{{ getCurrentHandler(detailModalRecord) }}</div></div>
        </div>

        <div class="ps-alert ps-alert--warning" style="margin-top: 16px" v-if="detailRecordOverSixMonths">该员工试用期已超过 6 个月，请关注结果发布时间。</div>

        <div class="ps-section-title" style="margin-top: 16px">目标信息</div>
        <table class="ps-table">
          <thead><tr><th>维度</th><th>内容</th><th>衡量方式/预期结果</th></tr></thead>
          <tbody>
            <tr v-if="!detailModalRecord.goals.length">
              <td colspan="3">暂无目标</td>
            </tr>
            <tr v-for="goal in detailModalRecord.goals" :key="goal.goal_id">
              <td>{{ goal.dimension }}</td>
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
          <div class="ps-alert ps-alert--info" style="margin-top: 16px">确认后将开启该员工的转正自评流程。</div>
          <div class="ps-toolbar" style="margin-top: 16px">
            <div class="ps-toolbar__spacer"></div>
            <a-button size="small" @click="closeActionModal">取消</a-button>
            <a-button size="small" type="primary" @click="handleTrigger">确认发起</a-button>
          </div>
        </template>

        <template v-if="actionModalType === 'hrbp-hold'">
          <div class="ps-alert ps-alert--warning" style="margin-top: 16px">确认后将挂起该员工当前流程，不再继续触发转正节点。</div>
          <div class="ps-toolbar" style="margin-top: 16px">
            <div class="ps-toolbar__spacer"></div>
            <a-button size="small" @click="closeActionModal">取消</a-button>
            <a-button size="small" danger @click="handleHold">确认挂起</a-button>
          </div>
        </template>

        <template v-if="actionModalType === 'hrbp-approval'">
          <div class="ps-alert ps-alert--info" style="margin-top: 16px">确认后将发起该员工的转正审批流程，提交至审批人审批。</div>
          <div class="ps-toolbar" style="margin-top: 16px">
            <div class="ps-toolbar__spacer"></div>
            <a-button size="small" @click="closeActionModal">取消</a-button>
            <a-button size="small" type="primary" @click="handleTriggerApproval">确认发起</a-button>
          </div>
        </template>

        <template v-if="actionModalType === 'hrbp-publish'">
          <div class="ps-alert ps-alert--warning" style="margin-top: 16px" v-if="actionRecordOverSixMonths">该员工试用期已超过 6 个月，请尽快发布结果。</div>
          <div class="ps-section-title" style="margin-top: 16px">现有评价记录</div>
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
            <label>发布选项</label>
            <a-checkbox v-model:checked="allowEmployeeView">允许员工查看主管评价内容</a-checkbox>
          </div>
          <div class="ps-toolbar" style="margin-top: 16px">
            <div class="ps-toolbar__spacer"></div>
            <a-button size="small" @click="closeActionModal">取消</a-button>
            <a-button size="small" type="primary" @click="handlePublish">发布结果</a-button>
          </div>
        </template>
      </div>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { message } from 'ant-design-vue'
import { useProbationStore, getCurrentHandler, getDetailedStatusText, getMonthsSinceHire, type ProbationMaster } from '@/store/probation'

type MainTab = 'todo' | 'unfinished' | 'finished'
type StageFilter = '01' | '02_03' | '04' | '05' | '06' | '07' | '08' | '09'
type ActionModalType = 'hrbp-trigger' | 'hrbp-hold' | 'hrbp-publish' | 'hrbp-approval'

const store = useProbationStore()

const activeTab = ref<MainTab>('todo')
const activeStageFilters = ref<StageFilter[]>([])
const searchText = ref('')
const filterDept = ref<string>()

const detailModalVisible = ref(false)
const detailModalRecord = ref<ProbationMaster | null>(null)
const actionModalVisible = ref(false)
const actionModalType = ref<ActionModalType>('hrbp-trigger')
const actionModalRecord = ref<ProbationMaster | null>(null)
const allowEmployeeView = ref(false)

const stageOptions = [
  { value: '01', label: '待设定目标' },
  { value: '02_03', label: '已设定目标' },
  { value: '04', label: '待发起流程' },
  { value: '05', label: '待员工自评' },
  { value: '06', label: '待评估' },
  { value: '07', label: '待发起审批' },
  { value: '08', label: '审批中' },
  { value: '09', label: '待发布' }
] satisfies { value: StageFilter; label: string }[]

const deptOptions = computed(() => Array.from(new Set(store.records.map(item => `${item.parent_dept}\\${item.dept_name}`))))

const rows = computed(() => {
  let list = store.records

  if (activeTab.value === 'todo') {
    list = list.filter(item => ['04', '07', '09'].includes(item.probation_status))
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

  if (activeTab.value !== 'finished') {
    list = [...list].sort((a, b) => getPriority(a) - getPriority(b) || new Date(a.hire_date).getTime() - new Date(b.hire_date).getTime())
  }

  return list
})

const actionModalTitle = computed(() => {
  if (actionModalType.value === 'hrbp-trigger') return '发起转正流程'
  if (actionModalType.value === 'hrbp-hold') return '暂不发起'
  if (actionModalType.value === 'hrbp-approval') return '发起审批'
  return '发布结果'
})

const detailRecordOverSixMonths = computed(() => detailModalRecord.value ? parseFloat(getMonthsSinceHire(detailModalRecord.value.hire_date)) >= 6 : false)
const actionRecordOverSixMonths = computed(() => actionModalRecord.value ? parseFloat(getMonthsSinceHire(actionModalRecord.value.hire_date)) >= 6 : false)

function getPriority(record: ProbationMaster) {
  if (record.probation_status === '04') return 0
  if (record.probation_status === '07') return 0
  if (record.probation_status === '09') return 1
  return 2
}

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
  if (tab !== 'unfinished') activeStageFilters.value = []
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
  allowEmployeeView.value = false
}

function closeActionModal() {
  actionModalVisible.value = false
  actionModalRecord.value = null
}

function handleTrigger() {
  if (!actionModalRecord.value) return
  store.triggerProbation(actionModalRecord.value.master_id)
  message.success('已发起转正流程')
  closeActionModal()
}

function handleHold() {
  if (!actionModalRecord.value) return
  store.holdProbation(actionModalRecord.value.master_id)
  message.warning('记录已挂起')
  closeActionModal()
}

function handlePublish() {
  if (!actionModalRecord.value) return
  store.publishResult(actionModalRecord.value.master_id, allowEmployeeView.value)
  message.success('结果已发布')
  closeActionModal()
}

function handleTriggerApproval() {
  if (!actionModalRecord.value) return
  store.triggerApproval(actionModalRecord.value.master_id)
  message.success('已发起转正审批流程')
  closeActionModal()
}
</script>
