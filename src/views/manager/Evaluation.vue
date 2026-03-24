<template>
  <div style="padding-bottom: 50px">
    <a-page-header
      title="试用期评价与转正决策"
      :sub-title="`员工：${record?.emp_name} (${record?.emp_id}) | 岗位：${record?.position} | ${record?.parent_dept}\\${record?.dept_name}`"
      @back="() => router.back()"
    />

    <a-row :gutter="16">
      <a-col :span="16">
        <!-- 目标 -->
        <a-card title="试用期考核目标">
          <a-table :dataSource="record?.goals" :columns="goalColumns" :pagination="false" rowKey="goal_id" bordered size="small" />
        </a-card>

        <!-- 自评 -->
        <a-card title="员工自评与总结" style="margin-top: 16px">
          <div v-if="selfEval" style="white-space: pre-wrap; background: #fafafa; padding: 12px; border-radius: 4px;">
            {{ selfEval.content }}
          </div>
          <a-empty v-else description="员工暂未填写自评" />
        </a-card>

        <!-- 已有评价记录 -->
        <a-card title="评价记录" style="margin-top: 16px" v-if="otherEvals.length > 0">
          <a-list item-layout="vertical" :data-source="otherEvals">
            <template #renderItem="{ item }">
              <a-list-item>
                <a-list-item-meta :description="item.create_time">
                  <template #title>
                    <a-tag :color="evalTypeColor(item.eval_type)">{{ evalTypeLabel(item.eval_type) }}</a-tag>
                    {{ item.evaluator_name }}
                  </template>
                </a-list-item-meta>
                <div style="white-space: pre-wrap; background: #fafafa; padding: 8px; border-radius: 4px;">{{ item.content }}</div>
              </a-list-item>
            </template>
          </a-list>
        </a-card>
      </a-col>

      <a-col :span="8">
        <!-- 员工信息 -->
        <a-card title="员工信息" style="margin-bottom: 16px" size="small">
          <template #extra>
            <a-button type="link" size="small">查看员工档案</a-button>
          </template>
          <a-descriptions :column="1" size="small">
            <a-descriptions-item label="直属部门">{{ record?.parent_dept }}\{{ record?.dept_name }}</a-descriptions-item>
            <a-descriptions-item label="岗位">{{ record?.position }}</a-descriptions-item>
            <a-descriptions-item label="职级">P6</a-descriptions-item>
            <a-descriptions-item label="M/P">专业</a-descriptions-item>
            <a-descriptions-item label="入职日期">{{ record?.hire_date }}</a-descriptions-item>
            <a-descriptions-item label="入职时长">{{ getMonthsSinceHire(record?.hire_date || '') }} 个月</a-descriptions-item>
            <a-descriptions-item label="直属上级">{{ record?.manager_name }}</a-descriptions-item>
            <a-descriptions-item label="HRBP">{{ record?.hrbp_name }}</a-descriptions-item>
          </a-descriptions>
        </a-card>

        <!-- 主管决策 -->
        <a-card title="主管评价" :bordered="false" style="background-color: #f0f5ff">
          <a-alert
            v-if="record?.manager_eval_done"
            type="success" message="您已完成评价" show-icon style="margin-bottom: 16px"
          />
          <a-alert
            v-else-if="record?.probation_status !== '06'"
            type="info" message="当前阶段不可评价" :description="`当前状态：${getDetailedStatusText(record!)}`" show-icon style="margin-bottom: 16px"
          />

          <a-form layout="vertical">
            <a-form-item label="建议转正结论" required>
              <a-radio-group v-model:value="decision" button-style="solid" :disabled="cannotEval">
                <a-radio-button value="超出预期">超出预期</a-radio-button>
                <a-radio-button value="符合预期">符合预期</a-radio-button>
                <a-radio-button value="不符合录用条件">不符合</a-radio-button>
              </a-radio-group>
            </a-form-item>

            <a-form-item label="评价意见与客观事实" :required="decision === '不符合录用条件'">
              <a-textarea
                v-model:value="reason"
                :rows="6"
                placeholder="请填写评价意见。如选择不符合条件，此处为必填项。"
                :disabled="cannotEval"
              />
            </a-form-item>

            <div style="margin-top: 24px">
              <a-button
                type="primary" block size="large"
                :disabled="cannotEval"
                @click="handleSubmit"
                :loading="saving"
              >
                提交上级评价
              </a-button>
              <div style="text-align: center; margin-top: 8px; color: #999; font-size: 12px" v-if="!cannotEval">
                提交后将等待 HRBP 完成评价，双方均评价后进入审批
              </div>
            </div>
          </a-form>
        </a-card>
      </a-col>
    </a-row>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useProbationStore, getDetailedStatusText, getMonthsSinceHire, EvaluationItem } from '@/store/probation';
import { message } from 'ant-design-vue';

const route = useRoute();
const router = useRouter();
const store = useProbationStore();
const saving = ref(false);

const recordId = route.params.id as string;
const record = computed(() => store.records.find(r => r.master_id === recordId));

const cannotEval = computed(() => {
  if (!record.value) return true;
  return record.value.probation_status !== '06' || record.value.manager_eval_done;
});

const goalColumns = [
  { title: '考核维度', dataIndex: 'dimension', width: 100 },
  { title: '目标内容', dataIndex: 'content' },
  { title: '权重', dataIndex: 'weight', width: 80, customRender: ({text}: any) => `${text}%` }
];

const selfEval = computed(() => (record.value?.evaluations || []).find(e => e.eval_type === 'self'));
const otherEvals = computed(() => (record.value?.evaluations || []).filter((e: EvaluationItem) => e.eval_type !== 'self'));

const evalTypeLabel = (type: string) => {
  const map: Record<string, string> = { 'self': '自评', 'manager': '上级评价', 'hrbp': 'HRBP评价', 'invited': '受邀评价' };
  return map[type] || type;
};
const evalTypeColor = (type: string) => {
  const map: Record<string, string> = { 'self': 'blue', 'manager': 'green', 'hrbp': 'purple', 'invited': 'cyan' };
  return map[type] || 'default';
};

const decision = ref<'超出预期' | '符合预期' | '不符合录用条件'>('符合预期');
const reason = ref('');

const handleSubmit = () => {
  if (decision.value === '不符合录用条件' && !reason.value.trim()) {
    message.error('结论为"不符合"时，评价意见为必填项'); return;
  }
  saving.value = true;
  setTimeout(() => {
    store.submitManagerEval(record.value!.master_id, reason.value || '主管评价通过', decision.value);
    message.success('上级评价提交成功！' + (record.value?.hrbp_eval_done ? '双方评价完成，已进入审批流程。' : '等待 HRBP 完成评价后进入审批。'));
    saving.value = false;
    router.push('/manager/team');
  }, 800);
};
</script>
