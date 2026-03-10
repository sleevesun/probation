<template>
  <div>
    <a-page-header title="审批中心" sub-title="您的待办与已办审批记录" />

    <a-tabs v-model:activeKey="activeTab">
      <a-tab-pane key="todo" tab="待我审批">
        <a-table :dataSource="todoList" :columns="columns" rowKey="master_id" bordered>
          <template #bodyCell="{ column, record }">
            <template v-if="column.dataIndex === 'dept_display'">{{ record.parent_dept }}\{{ record.dept_name }}</template>
            <template v-if="column.key === 'action'">
              <a-button type="primary" size="small" @click="openDrawer(record)">去审批</a-button>
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
          </template>
        </a-table>
      </a-tab-pane>
    </a-tabs>

    <!-- 审批详情抽屉 -->
    <a-drawer v-model:open="drawerVisible" title="试用期转正审批详情" width="800" placement="right">
      <div v-if="currentRecord">
        <a-descriptions title="员工档案快照" bordered size="small" :column="2">
          <a-descriptions-item label="姓名">{{ currentRecord.emp_name }}</a-descriptions-item>
          <a-descriptions-item label="工号">{{ currentRecord.emp_id }}</a-descriptions-item>
          <a-descriptions-item label="岗位">{{ currentRecord.position }}</a-descriptions-item>
          <a-descriptions-item label="部门">{{ currentRecord.parent_dept }}\{{ currentRecord.dept_name }}</a-descriptions-item>
          <a-descriptions-item label="直属主管">{{ currentRecord.manager_name }}</a-descriptions-item>
          <a-descriptions-item label="入职时间">{{ currentRecord.hire_date }}</a-descriptions-item>
          <a-descriptions-item label="建议转正结论" :span="2">
            <b :style="{ color: currentRecord.final_decision === '不符合录用条件' ? '#f5222d' : '#1890ff' }">
              {{ currentRecord.final_decision }}
            </b>
          </a-descriptions-item>
        </a-descriptions>

        <a-divider />

        <h3>评审记录</h3>
        <a-timeline>
          <a-timeline-item color="green">
            <p><strong>{{ currentRecord.emp_name }} (员工自评)</strong></p>
            <p>{{ getEval(currentRecord, 'self')?.content || '无数据' }}</p>
          </a-timeline-item>
          <a-timeline-item color="blue">
            <p><strong>{{ currentRecord.manager_name }} (直属主管评价)</strong></p>
            <p>{{ getEval(currentRecord, 'manager')?.content || '无数据' }}</p>
          </a-timeline-item>
          <a-timeline-item color="purple">
            <p><strong>{{ currentRecord.hrbp_name }} (HRBP评价)</strong></p>
            <p>{{ getEval(currentRecord, 'hrbp')?.content || '无数据' }}</p>
          </a-timeline-item>
        </a-timeline>

        <!-- 历史审批日志 -->
        <div v-if="currentRecord.approval_logs.length > 0" style="margin-top: 16px">
          <h3>审批历史</h3>
          <a-timeline>
            <a-timeline-item v-for="log in currentRecord.approval_logs" :key="log.log_id"
              :color="log.action === '同意' ? 'green' : 'red'">
              <p><strong>{{ log.node_name }} - {{ log.approver_name }}</strong> ({{ log.action }})</p>
              <p v-if="log.comment">{{ log.comment }}</p>
              <p style="color: #999; font-size: 12px">{{ log.action_time }}</p>
            </a-timeline-item>
          </a-timeline>
        </div>

        <a-divider />

        <h3>审批操作</h3>
        <a-form layout="vertical">
          <a-form-item label="审批意见">
            <a-textarea v-model:value="approvalComment" :rows="4" placeholder="请输入您的审批意见（同意可不填，拒绝必填）" />
          </a-form-item>

          <a-space>
            <a-button @click="drawerVisible = false">取消返回</a-button>
            <a-button danger @click="handleReject" :loading="saving">退回/拒绝</a-button>
            <a-button type="primary" @click="handleApprove" :loading="saving">同意</a-button>
          </a-space>
        </a-form>
      </div>
    </a-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useProbationStore, ProbationMaster } from '@/store/probation';
import { message } from 'ant-design-vue';

const store = useProbationStore();
const activeTab = ref('todo');

// 状态 08 = 转正流程审批
const todoList = computed(() => store.records.filter(r => r.probation_status === '08'));
// 已办 = 09 或 10 (有 approval_logs)
const doneList = computed(() => store.records.filter(r => ['09', '10'].includes(r.probation_status) && r.approval_logs.length > 0));

const columns = [
  { title: '标题', customRender: ({record}: any) => `关于 ${record.emp_name} 的试用期转正申请` },
  { title: '部门', dataIndex: 'dept_display', width: 160 },
  { title: '发起人', dataIndex: 'manager_name' },
  { title: '操作', key: 'action', width: 150 }
];

const doneColumns = [
  { title: '标题', customRender: ({record}: any) => `关于 ${record.emp_name} 的试用期转正申请` },
  { title: '部门', dataIndex: 'dept_display', width: 160 },
  { title: '结论', dataIndex: 'final_decision', width: 130 }
];

const drawerVisible = ref(false);
const currentRecord = ref<ProbationMaster | null>(null);
const approvalComment = ref('');
const saving = ref(false);

const openDrawer = (record: ProbationMaster) => {
  currentRecord.value = record; approvalComment.value = ''; drawerVisible.value = true;
};

const getEval = (record: ProbationMaster, type: string) => {
  return record.evaluations?.find(e => e.eval_type === type);
};

const handleApprove = () => {
  if (currentRecord.value) {
    saving.value = true;
    setTimeout(() => {
      // 审批通过 -> 09 待发布结果
      store.approveRecord(currentRecord.value!.master_id, '审批人A', '二级部门负责人', approvalComment.value || '同意转正');
      message.success('已同意审批，流转至 HRBP 发布结果');
      saving.value = false;
      drawerVisible.value = false;
    }, 600);
  }
};

const handleReject = () => {
  if (!approvalComment.value.trim()) { message.error('退回/拒绝必须提供审批意见'); return; }
  if (currentRecord.value) {
    saving.value = true;
    setTimeout(() => {
      store.rejectRecord(currentRecord.value!.master_id, '审批人A', '二级部门负责人', approvalComment.value);
      message.warning('已退回至评价阶段');
      saving.value = false;
      drawerVisible.value = false;
    }, 600);
  }
};
</script>
