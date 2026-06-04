<template>
  <div>
    <a-page-header title="我的试用期" :sub-title="`已入职 ${daysSinceHire} 天`">
      <template #tags>
        <a-tag :color="STATUS_COLOR[record?.probation_status || '01']">{{ currentStatusText }}</a-tag>
      </template>
    </a-page-header>

    <a-card style="margin-top: 16px">
      <a-steps :current="currentStep" size="small" :status="stepStatus">
        <a-step title="提交目标" />
        <a-step title="上级确认" />
        <a-step title="试用期自评" />
        <a-step title="完成" />
      </a-steps>
    </a-card>

    <!-- 员工信息 -->
    <a-card title="我的信息" :bordered="false" style="margin-top: 24px">
      <a-descriptions :column="2">
         <a-descriptions-item label="姓名">{{ record?.emp_name }}</a-descriptions-item>
         <a-descriptions-item label="工号">{{ record?.emp_id }}</a-descriptions-item>
         <a-descriptions-item label="岗位">{{ record?.position }}</a-descriptions-item>
         <a-descriptions-item label="部门">{{ record?.parent_dept }}\{{ record?.dept_name }}</a-descriptions-item>
         <a-descriptions-item label="直属主管">{{ record?.manager_name }}</a-descriptions-item>
         <a-descriptions-item label="入职日期">{{ record?.hire_date }}</a-descriptions-item>
      </a-descriptions>
    </a-card>

    <!-- 当前进展 -->
    <a-card title="当前进展" :bordered="false" style="margin-top: 16px">
          <template #extra>
            <a-space v-if="todoList.length > 1">
              <a-button type="text" size="small" :disabled="currentTodoIndex === 0" @click="prevTodo">
                <template #icon><left-outlined /></template>
              </a-button>
              <span>{{ currentTodoIndex + 1 }} / {{ todoList.length }}</span>
              <a-button type="text" size="small" :disabled="currentTodoIndex === todoList.length - 1" @click="nextTodo">
                <template #icon><right-outlined /></template>
              </a-button>
            </a-space>
          </template>

          <a-list item-layout="horizontal" v-if="currentTodo">
            <a-list-item v-if="currentTodo.type === 'alert'">
              <a-alert type="warning" show-icon style="width: 100%">
                <template #message>{{ currentTodo.title }}</template>
                <template #description>{{ currentTodo.desc }}</template>
              </a-alert>
            </a-list-item>

            <a-list-item v-else-if="currentTodo.type === 'alert-action'">
              <a-alert type="warning" show-icon style="width: 100%">
                <template #message>{{ currentTodo.title }}</template>
                <template #description>
                  <div style="white-space: pre-line; margin-bottom: 8px">{{ currentTodo.desc }}</div>
                  <a-button type="primary" size="small" @click="router.push(currentTodo.path)">去修改</a-button>
                </template>
              </a-alert>
            </a-list-item>

            <a-list-item v-else>
              <a-list-item-meta :description="currentTodo.desc">
                <template #title>
                  <a v-if="currentTodo.path" href="javascript:;" @click="router.push(currentTodo.path)">
                    {{ currentTodo.title }}
                  </a>
                  <span v-else :style="{ color: currentTodo.type === 'result' ? currentTodo.color : 'inherit' }">
                    {{ currentTodo.title }}
                  </span>
                </template>
                <template #avatar>
                  <a-avatar :style="{ backgroundColor: currentTodo.color }">
                    <exception-outlined v-if="currentTodo.icon === 'exception'" />
                    <form-outlined v-else-if="currentTodo.icon === 'form'" />
                    <clock-circle-outlined v-else-if="currentTodo.icon === 'clock'" />
                    <loading-outlined v-else-if="currentTodo.icon === 'loading'" />
                    <check-outlined v-else-if="currentTodo.icon === 'check'" />
                  </a-avatar>
                </template>
              </a-list-item-meta>
              <template #actions v-if="currentTodo.path">
                <a-button type="primary" size="small" @click="router.push(currentTodo.path)">去处理</a-button>
              </template>
            </a-list-item>
          </a-list>

        </a-card>

    <!-- 阶段性评价记录 -->
    <a-card title="阶段性评价记录" :bordered="false" style="margin-top: 16px">
      <a-table v-if="(record?.stage_evaluations || []).length > 0" :dataSource="record?.stage_evaluations || []" :columns="stageEvalColumns" :pagination="false" rowKey="stage_eval_id" size="small" bordered />
      <a-empty v-else description="暂无阶段性评价记录" />
    </a-card>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useProbationStore, STATUS_COLOR, getDetailedStatusText } from '@/store/probation';
import { ExceptionOutlined, FormOutlined, ClockCircleOutlined, LoadingOutlined, CheckOutlined, LeftOutlined, RightOutlined } from '@ant-design/icons-vue';

const router = useRouter();
const store = useProbationStore();

const record = computed(() => store.records.find(r => r.emp_id === store.currentEmpId));
const currentStatusText = computed(() => record.value ? getDetailedStatusText(record.value) : '');

const stageEvalColumns = [
  { title: '填写人', dataIndex: 'evaluator_name', width: 80 },
  { title: '角色', dataIndex: 'evaluator_role', width: 80 },
  { title: '评价内容', dataIndex: 'content' },
  { title: '时间', dataIndex: 'create_time', width: 150 }
];

const daysSinceHire = computed(() => {
  if (!record.value) return 0;
  const now = new Date(); const hire = new Date(record.value.hire_date);
  return Math.floor((now.getTime() - hire.getTime()) / (1000 * 60 * 60 * 24));
});

// --- 待办事项逻辑重构 ---
const currentTodoIndex = ref(0);

const todoList = computed(() => {
  const status = record.value?.probation_status;
  const items: any[] = [];

  switch (status) {
    case '01': {
      const isReturned = !!record.value?.return_comment;
      items.push({
        id: '01',
        type: isReturned ? 'alert-action' : 'action',
        title: isReturned ? '目标被退回，请修改后重新提交' : '【待办】填写试用期目标',
        desc: isReturned
          ? `退回意见：${record.value.return_comment}\n请根据上级意见调整目标内容，修改完成后重新提交。`
          : '请在入职 2 周内完成试用期目标的设定并提交上级确认。',
        icon: 'exception',
        color: '#f56a00',
        path: '/employee/goals'
      });
      break;
    }
    case '02':
      items.push({
        id: '02',
        type: 'info',
        title: '【进行中】等待上级确认目标',
        desc: '您的试用期目标已提交，正在等待上级确认。',
        icon: 'clock',
        color: '#1890ff'
      });
      break;
    case '03':
    case '04':
      items.push({
        id: '03',
        type: 'info',
        title: '【进行中】目标已确认',
        desc: '目标已确认，等待试用期评估开启。',
        icon: 'check',
        color: '#52c41a'
      });
      break;
    case '05':
      items.push({
        id: '05',
        type: 'action',
        title: '【待办】填写试用期自评',
        desc: '转正流程已开启，请尽快完成转正自评。',
        icon: 'form',
        color: '#87d068',
        path: '/employee/self-eval'
      });
      break;
    case '06':
    case '07':
    case '08':
    case '09':
      items.push({
        id: 'eval',
        type: 'info',
        title: '【进行中】试用期评估中',
        desc: '您的试用期评估正在进行中，请耐心等待结果。',
        icon: 'loading',
        color: '#722ed1'
      });
      break;
    case '10': {
      const isPassed = record.value?.final_decision !== '不符合转正条件';
      items.push({
        id: '10',
        type: 'result',
        title: isPassed ? '【结果】恭喜您通过转正！' : '【结果】未通过转正',
        desc: isPassed ? '恭喜您通过试用期转正，祝您工作顺利！' : '很遗憾，您未通过试用期转正。',
        icon: isPassed ? 'check' : 'exception',
        color: isPassed ? '#52c41a' : '#f5222d'
      });
      break;
    }
    default:
      break;
  }

  return items;
});

const currentTodo = computed(() => {
  return todoList.value[currentTodoIndex.value] || null;
});

const prevTodo = () => {
  if (currentTodoIndex.value > 0) {
    currentTodoIndex.value--;
  }
};

const nextTodo = () => {
  if (currentTodoIndex.value < todoList.value.length - 1) {
    currentTodoIndex.value++;
  }
};
// ------------------------

// 进度条: 提交目标(0) -> 上级确认(1) -> 试用期自评(2) -> 完成(3)
const currentStep = computed(() => {
  const s = record.value?.probation_status;
  switch (s) {
    case '01': return 0;
    case '02': return 1;
    case '03': case '04': return 1;
    case '05': return 2;
    case '06': case '07': case '08': case '09': return 2;
    case '10': return 3;
    default: return 0;
  }
});

const stepStatus = computed(() => {
  if (record.value?.probation_status === '10' && record.value.final_decision === '不符合转正条件') return 'error';
  if (record.value?.probation_status === '10') return 'finish';
  return 'process';
});


</script>
