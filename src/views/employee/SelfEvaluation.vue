<template>
  <div style="padding-bottom: 50px">
    <a-page-header title="试用期自评" @back="() => router.back()" />

    <a-alert
      v-if="record?.probation_status !== '05'"
      message="提示"
      :description="record?.probation_status === '06' ? '您的自评已提交，正在等待上级和HRBP评价。' : '当前不在自评阶段，仅供查阅。'"
      type="warning"
      show-icon
      style="margin-bottom: 16px"
    />

    <a-card title="试用期考核目标 (只读锁定)">
      <a-table
        :dataSource="record?.goals"
        :columns="columns"
        :pagination="false"
        rowKey="goal_id"
        bordered
        size="small"
      />
    </a-card>

    <a-card title="自我评价与工作总结" style="margin-top: 16px">
      <a-form layout="vertical">
        <a-form-item label="请详细描述您在试用期内的工作产出、亮点与不足：" required>
          <a-textarea
            v-model:value="selfEvalContent"
            :rows="6"
            placeholder="请输入自评内容..."
            :disabled="record?.probation_status !== '05'"
          />
        </a-form-item>

        <div style="text-align: right" v-if="record?.probation_status === '05'">
          <a-space>
            <a-button @click="router.back()">取消</a-button>
            <a-button type="primary" @click="handleSubmit" :loading="saving">提交自评</a-button>
          </a-space>
        </div>
      </a-form>
    </a-card>

    <a-card v-if="historyEvals.length > 0" title="已提交的评价记录" style="margin-top: 16px">
      <a-list item-layout="vertical" :data-source="historyEvals">
        <template #renderItem="{ item }">
          <a-list-item>
            <a-list-item-meta :description="item.create_time">
              <template #title>
                <a-tag :color="evalTypeColor(item.eval_type)">{{ evalTypeLabel(item.eval_type) }}</a-tag>
                {{ item.evaluator_name }}
              </template>
              <template #avatar><a-avatar><user-outlined /></a-avatar></template>
            </a-list-item-meta>
            <div style="white-space: pre-wrap; background: #fafafa; padding: 12px; border-radius: 4px;">{{ item.content }}</div>
          </a-list-item>
        </template>
      </a-list>
    </a-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useProbationStore } from '@/store/probation';
import { message } from 'ant-design-vue';
import { UserOutlined } from '@ant-design/icons-vue';

const router = useRouter();
const store = useProbationStore();
const saving = ref(false);

const record = computed(() => store.records.find(r => r.emp_id === store.currentEmpId));

const columns = [
  { title: '考核维度', dataIndex: 'dimension', width: 150 },
  { title: '目标内容与衡量标准', dataIndex: 'content' },
  { title: '权重', dataIndex: 'weight', width: 120, customRender: ({text}: any) => `${text}%` }
];

const selfEvalContent = ref('');

const historyEvals = computed(() => record.value?.evaluations || []);

const evalTypeLabel = (type: string) => {
  const map: Record<string, string> = { 'self': '自评', 'manager': '上级评价', 'hrbp': 'HRBP评价', 'invited': '受邀评价' };
  return map[type] || type;
};
const evalTypeColor = (type: string) => {
  const map: Record<string, string> = { 'self': 'blue', 'manager': 'green', 'hrbp': 'purple', 'invited': 'cyan' };
  return map[type] || 'default';
};

const handleSubmit = () => {
  if (!selfEvalContent.value.trim()) { message.error('自评内容不能为空'); return; }
  saving.value = true;
  setTimeout(() => {
    store.submitSelfEval(record.value!.master_id, selfEvalContent.value, record.value!.emp_name);
    message.success('自评提交成功！已同时开启上级评价和HRBP评价流程。');
    saving.value = false;
    router.push('/employee/dashboard');
  }, 800);
};
</script>
