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
          <template #extra><a href="#">查看全部</a></template>

          <a-list item-layout="horizontal">
            <!-- 状态01: 待设定目标 -->
            <a-list-item v-if="record?.probation_status === '01'">
              <a-list-item-meta description="请在入职 2 周内完成试用期目标的设定并提交上级确认。">
                <template #title>
                  <a href="javascript:;" @click="router.push('/employee/goals')">【待办】填写试用期目标</a>
                </template>
                <template #avatar><a-avatar style="background-color: #f56a00"><exception-outlined /></a-avatar></template>
              </a-list-item-meta>
              <template #actions><a-button type="primary" size="small" @click="router.push('/employee/goals')">去处理</a-button></template>
            </a-list-item>

            <!-- 退回意见提示 -->
            <a-list-item v-if="record?.return_comment && record?.probation_status === '01'">
              <a-alert type="warning" show-icon style="width: 100%">
                <template #message>上级退回意见</template>
                <template #description>{{ record.return_comment }}</template>
              </a-alert>
            </a-list-item>

            <!-- 状态02: 目标待确认（等待中） -->
            <a-list-item v-if="record?.probation_status === '02'">
              <a-list-item-meta description="您的试用期目标已提交，正在等待上级确认。">
                <template #title><span>【进行中】等待上级确认目标</span></template>
                <template #avatar><a-avatar style="background-color: #1890ff"><clock-circle-outlined /></a-avatar></template>
              </a-list-item-meta>
            </a-list-item>

            <!-- 状态05: 待员工自评 -->
            <a-list-item v-if="record?.probation_status === '05'">
              <a-list-item-meta description="转正流程已开启，请尽快完成转正自评。">
                <template #title>
                  <a href="javascript:;" @click="router.push('/employee/self-eval')">【待办】填写试用期自评</a>
                </template>
                <template #avatar><a-avatar style="background-color: #87d068"><form-outlined /></a-avatar></template>
              </a-list-item-meta>
              <template #actions><a-button type="primary" size="small" @click="router.push('/employee/self-eval')">去处理</a-button></template>
            </a-list-item>

            <!-- 状态06: 评价阶段（等待中） -->
            <a-list-item v-if="record?.probation_status === '06'">
              <a-list-item-meta description="您的自评已提交，正在等待上级和 HRBP 完成评价。">
                <template #title><span>【进行中】等待上级与 HRBP 评价</span></template>
                <template #avatar><a-avatar style="background-color: #722ed1"><loading-outlined /></a-avatar></template>
              </a-list-item-meta>
            </a-list-item>

            <!-- 状态08: 转正流程审批（等待中） -->
            <a-list-item v-if="record?.probation_status === '08'">
              <a-list-item-meta description="您的转正申请正在审批流程中，请耐心等待。">
                <template #title><span>【进行中】转正流程审批中</span></template>
                <template #avatar><a-avatar style="background-color: #fa8c16"><loading-outlined /></a-avatar></template>
              </a-list-item-meta>
            </a-list-item>

            <!-- 状态10: 结果已发布（可查看结果） -->
            <a-list-item v-if="record?.probation_status === '10' && canViewResult">
              <a-list-item-meta :description="resultDescription">
                <template #title>
                  <span :style="{ color: record?.final_decision === '不符合录用条件' ? '#f5222d' : '#52c41a' }">
                    【结果】{{ record?.final_decision === '不符合录用条件' ? '试用期未通过' : '恭喜您通过转正！' }}
                  </span>
                </template>
                <template #avatar><a-avatar :style="{ backgroundColor: record?.final_decision === '不符合录用条件' ? '#f5222d' : '#52c41a' }"><check-outlined /></a-avatar></template>
              </a-list-item-meta>
            </a-list-item>
            <a-list-item v-if="record?.probation_status === '10' && !canViewResult">
              <a-list-item-meta description="您的转正结果将在入职满 5.5 个月后通知，请耐心等待。">
                <template #title><span>【进行中】等待结果通知</span></template>
                <template #avatar><a-avatar style="background-color: #fa8c16"><clock-circle-outlined /></a-avatar></template>
              </a-list-item-meta>
            </a-list-item>

            <a-empty v-if="!['01', '02', '05', '06', '08', '10'].includes(record?.probation_status || '')" description="暂无待办事项" />
          </a-list>

          <!-- 状态10: 如果 HRBP 开放了评价，展示评价内容 -->
          <div v-if="record?.probation_status === '10' && canViewResult && record?.allow_employee_view_eval" style="margin-top: 16px">
            <a-card title="上级评价" size="small" :bordered="true" style="background: #f6ffed">
              <p v-if="managerEval">{{ managerEval.content }}</p>
              <a-empty v-else description="暂无评价" />
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
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useProbationStore } from '@/store/probation';
import { ExceptionOutlined, FormOutlined, ClockCircleOutlined, LoadingOutlined, CheckOutlined } from '@ant-design/icons-vue';

const router = useRouter();
const store = useProbationStore();

const record = computed(() => store.records.find(r => r.emp_id === store.currentEmpId));

const daysSinceHire = computed(() => {
  if (!record.value) return 0;
  const now = new Date(); const hire = new Date(record.value.hire_date);
  return Math.floor((now.getTime() - hire.getTime()) / (1000 * 60 * 60 * 24));
});

const monthsSinceHire = computed(() => {
  if (!record.value) return 0;
  const now = new Date(); const hire = new Date(record.value.hire_date);
  return (now.getTime() - hire.getTime()) / (1000 * 60 * 60 * 24 * 30.44);
});

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

// 是否满5.5个月可查看结果
const canViewResult = computed(() => monthsSinceHire.value >= 5.5);

const resultDescription = computed(() => {
  if (record.value?.final_decision === '不符合录用条件') return '很遗憾，您的试用期未通过。';
  return `转正结论：${record.value?.final_decision}。`;
});

const managerEval = computed(() => record.value?.evaluations.find(e => e.eval_type === 'manager'));
</script>
