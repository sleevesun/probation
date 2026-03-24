<template>
  <div>
    <a-page-header title="我的试用期" :sub-title="`入职第 ${daysSinceHire} 天 / 共 180 天`" />

    <a-card style="margin-top: 16px">
      <a-steps :current="currentStep" size="small" :status="stepStatus">
        <a-step title="提交目标" />
        <a-step title="上级确认" />
        <a-step title="自评" />
        <a-step title="审批中" />
        <a-step title="完成" />
      </a-steps>
    </a-card>

    <a-row :gutter="16" style="margin-top: 24px">
      <a-col :span="12">
        <a-card title="待办事项" :bordered="false">
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

          <!-- 状态10: 如果 HRBP 开放了评价，展示评价内容 -->
          <div style="margin-top: 16px" v-if="record?.probation_status === '10' && record?.allow_employee_view_eval">
            <a-card title="上级评价" size="small" :bordered="true" style="background: #f6ffed">
              <p>该员工在试用期内表现优异，专业能力强，团队协作意识好，建议按期转正。</p>
            </a-card>
          </div>
        </a-card>
      </a-col>

      <a-col :span="12">
        <a-card title="我的信息" :bordered="false">
          <a-descriptions :column="1">
             <a-descriptions-item label="姓名">{{ record?.emp_name }}</a-descriptions-item>
             <a-descriptions-item label="工号">{{ record?.emp_id }}</a-descriptions-item>
             <a-descriptions-item label="岗位">{{ record?.position }}</a-descriptions-item>
             <a-descriptions-item label="部门">{{ record?.parent_dept }}\{{ record?.dept_name }}</a-descriptions-item>
             <a-descriptions-item label="直属主管">{{ record?.manager_name }}</a-descriptions-item>
             <a-descriptions-item label="入职日期">{{ record?.hire_date }}</a-descriptions-item>
          </a-descriptions>
        </a-card>
      </a-col>
    </a-row>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useProbationStore } from '@/store/probation';
import { ExceptionOutlined, FormOutlined, ClockCircleOutlined, LoadingOutlined, CheckOutlined, LeftOutlined, RightOutlined } from '@ant-design/icons-vue';

const router = useRouter();
const store = useProbationStore();

const record = computed(() => store.records.find(r => r.emp_id === store.currentEmpId));

const daysSinceHire = computed(() => {
  if (!record.value) return 0;
  const now = new Date(); const hire = new Date(record.value.hire_date);
  return Math.floor((now.getTime() - hire.getTime()) / (1000 * 60 * 60 * 24));
});

// --- 待办事项逻辑重构 ---
const currentTodoIndex = ref(0);

const todoList = computed(() => {
  return [
    {
      id: '01',
      type: 'action',
      title: '【待办】填写试用期目标',
      desc: '请在入职 2 周内完成试用期目标的设定并提交上级确认。',
      icon: 'exception',
      color: '#f56a00',
      path: '/employee/goals'
    },
    {
      id: 'return_comment',
      type: 'alert',
      title: '上级退回意见',
      desc: record.value?.return_comment || '您的试用期目标需要调整，详细原因请参考沟通记录。'
    },
    {
      id: '02',
      type: 'info',
      title: '【进行中】等待上级确认目标',
      desc: '您的试用期目标已提交，正在等待上级确认。',
      icon: 'clock',
      color: '#1890ff'
    },
    {
      id: '05',
      type: 'action',
      title: '【待办】填写试用期自评',
      desc: '转正流程已开启，请尽快完成转正自评。',
      icon: 'form',
      color: '#87d068',
      path: '/employee/self-eval'
    },
    {
      id: '06',
      type: 'info',
      title: '【进行中】等待上级与 HRBP 评价',
      desc: '您的自评已提交，正在等待上级和 HRBP 完成评价。',
      icon: 'loading',
      color: '#722ed1'
    },
    {
      id: '08',
      type: 'info',
      title: '【进行中】转正流程审批中',
      desc: '您的转正申请正在审批流程中，请耐心等待。',
      icon: 'loading',
      color: '#fa8c16'
    },
    {
      id: '09',
      type: 'info',
      title: '【进行中】等待结果通知',
      desc: '您的转正结果将在入职满 5.5 个月后通知，请耐心等待。',
      icon: 'clock',
      color: '#fa8c16'
    },
    {
      id: '10',
      type: 'result',
      title: '【结果】恭喜您通过转正！',
      desc: '恭喜您通过转正！',
      icon: 'check',
      color: '#52c41a'
    }
  ];
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

// 进度条: 提交目标(0) -> 上级确认(1) -> 自评(2) -> 审批中(3) -> 完成(4)
const currentStep = computed(() => {
  const s = record.value?.probation_status;
  switch (s) {
    case '01': return 0;
    case '02': return 1;
    case '03': case '04': case '05': return 2;
    case '06': case '08': case '09': return 3;
    case '10': return 4;
    default: return 0;
  }
});

const stepStatus = computed(() => {
  if (record.value?.probation_status === '10' && record.value.final_decision === '不符合录用条件') return 'error';
  if (record.value?.probation_status === '10') return 'finish';
  return 'process';
});


</script>
