export interface EmailTemplate {
  id: string;
  title: string;
  role: '员工' | '上级' | 'HRBP';
  defaultVars: Record<string, string>;
  renderBody: (vars: Record<string, string>) => string;
}

// 获取当前环境的域名
const getBaseUrl = () => {
  return typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
};
const baseUrl = getBaseUrl();

// 统一的官方邮件皮肤
export const renderEmailSkin = (bodyHtml: string, subject: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #f5f5f5;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif;
      font-size: 14px;
      line-height: 1.6;
      color: #333333;
    }
    .email-container {
      max-width: 600px;
      margin: 40px auto;
      background-color: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
    }
    .email-header {
      background-color: #1890ff;
      padding: 24px 32px;
      color: #ffffff;
      text-align: left;
    }
    .email-header h1 {
      margin: 0;
      font-size: 20px;
      font-weight: 600;
    }
    .email-body {
      padding: 32px;
    }
    .email-body p {
      margin: 0 0 16px 0;
    }
    .email-button {
      display: inline-block;
      padding: 10px 24px;
      background-color: #1890ff;
      color: #ffffff !important;
      text-decoration: none;
      border-radius: 40px;
      font-weight: 500;
      margin-top: 16px;
      margin-bottom: 16px;
    }
    .email-footer {
      padding: 24px 32px;
      background-color: #fafafa;
      color: #999999;
      font-size: 12px;
      text-align: center;
      border-top: 1px solid #f0f0f0;
    }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="email-header">
      <h1>试用期管理系统</h1>
    </div>
    <div class="email-body">
      ${bodyHtml}
    </div>
    <div class="email-footer">
      <p>此邮件由系统自动发送，请勿直接回复。</p>
      <p>© 2025 公司人力资源部 保留所有权利</p>
    </div>
  </div>
</body>
</html>
`;

export const emailTemplates: EmailTemplate[] = [
  // --- 1. 目标设定阶段 ---
  {
    id: '01_goal_remind_employee',
    title: '【提醒】请提交试用期目标',
    role: '员工',
    defaultVars: {
      employee_name: '王明辉',
      hire_date: '2025-02-01',
      login_url: `${baseUrl}/auth/token?token=mock_token_emp&redirect=/employee/goals`
    },
    renderBody: (vars) => `
      <p>亲爱的 <strong>${vars.employee_name}</strong>，</p>
      <p>您已入职满 1 个月（入职日期：${vars.hire_date}），请及时登录试用期管理系统制定并提交您的试用期目标。</p>
      <p>明确的目标有助于您更好地融入团队并在试用期内取得优异表现。</p>
      <div style="text-align: center;">
        <a href="${vars.login_url}" target="_blank" class="email-button">前往提交试用期目标</a>
      </div>
    `
  },
  {
    id: '02_goal_reject_employee',
    title: '【通知】试用期目标被退回',
    role: '员工',
    defaultVars: {
      employee_name: '王明辉',
      manager_name: '陈思远',
      reject_reason: '业绩目标权重偏低，请调整。',
      login_url: `${baseUrl}/auth/token?token=mock_token_emp&redirect=/employee/goals`
    },
    renderBody: (vars) => `
      <p>亲爱的 <strong>${vars.employee_name}</strong>，</p>
      <p>您的试用期目标设定已被上级（<strong>${vars.manager_name}</strong>）退回。</p>
      <p style="padding: 12px; background-color: #fffbe6; border-left: 4px solid #faad14; color: #666;">
        <strong>退回原因：</strong><br>
        ${vars.reject_reason}
      </p>
      <p>请及时登录试用期管理系统进行修订并再次提交。</p>
      <div style="text-align: center;">
        <a href="${vars.login_url}" target="_blank" class="email-button">前往修订目标</a>
      </div>
    `
  },
  {
    id: '03_goal_submit_manager',
    title: '【待办】请确认员工试用期目标',
    role: '上级',
    defaultVars: {
      manager_name: '陈思远',
      employee_name: '王明辉',
      login_url: `${baseUrl}/auth/token?token=mock_token_mgr&redirect=/manager/dashboard`
    },
    renderBody: (vars) => `
      <p>亲爱的 <strong>${vars.manager_name}</strong>，</p>
      <p>您的团队成员 <strong>${vars.employee_name}</strong> 已提交了试用期目标。</p>
      <p>请及时登录试用期管理系统，进行确认或退回操作。</p>
      <div style="text-align: center;">
        <a href="${vars.login_url}" target="_blank" class="email-button">前往处理</a>
      </div>
    `
  },

  // --- 2. 开启试用期评估 ---
  {
    id: '04_eval_trigger_hrbp',
    title: '【待办】请开启试用期评估',
    role: 'HRBP',
    defaultVars: {
      hrbp_name: '刘建国',
      employee_name: '王明辉',
      hire_date: '2025-02-01',
      login_url: `${baseUrl}/auth/token?token=mock_token_hr&redirect=/hrbp/panorama`
    },
    renderBody: (vars) => `
      <p>亲爱的 <strong>${vars.hrbp_name}</strong>，</p>
      <p>员工 <strong>${vars.employee_name}</strong> 入职已满 4.5 个月（入职日期：${vars.hire_date}）。</p>
      <p>请及时登录试用期管理系统，开启其试用期评估流程。</p>
      <div style="text-align: center;">
        <a href="${vars.login_url}" target="_blank" class="email-button">前往开启评估</a>
      </div>
    `
  },
  {
    id: '05_eval_start_employee',
    title: '【待办】请完成试用期自评',
    role: '员工',
    defaultVars: {
      employee_name: '王明辉',
      deadline_date: '2025-07-01',
      login_url: `${baseUrl}/auth/token?token=mock_token_emp&redirect=/employee/self-eval`
    },
    renderBody: (vars) => `
      <p>亲爱的 <strong>${vars.employee_name}</strong>，</p>
      <p>您的试用期评估流程已开启。</p>
      <p>请及时登录试用期管理系统，进行试用期自评。为了不影响您的转正进度，请不要晚于 <strong>${vars.deadline_date}</strong> 提交。</p>
      <div style="text-align: center;">
        <a href="${vars.login_url}" target="_blank" class="email-button">前往填写自评</a>
      </div>
    `
  },

  // --- 3. 试用期评估 ---
  {
    id: '06_eval_todo_manager',
    title: '【待办】请进行试用期评估',
    role: '上级',
    defaultVars: {
      manager_name: '陈思远',
      employee_name: '王明辉',
      login_url: `${baseUrl}/auth/token?token=mock_token_mgr&redirect=/manager/evaluation/M001`
    },
    renderBody: (vars) => `
      <p>亲爱的 <strong>${vars.manager_name}</strong>，</p>
      <p>员工 <strong>${vars.employee_name}</strong> 已完成试用期自评。</p>
      <p>请及时登录试用期管理系统，进行 ${vars.employee_name} 的试用期评估。</p>
      <div style="text-align: center;">
        <a href="${vars.login_url}" target="_blank" class="email-button">前往评估</a>
      </div>
    `
  },

  // --- 4. 发起审批 ---
  {
    id: '07_approval_initiate_hrbp',
    title: '【待办】请发起转正审批流程',
    role: 'HRBP',
    defaultVars: {
      hrbp_name: '刘建国',
      employee_name: '王明辉',
      manager_name: '陈思远',
      eval_result: '符合预期',
      login_url: `${baseUrl}/auth/token?token=mock_token_hr&redirect=/hrbp/panorama`
    },
    renderBody: (vars) => `
      <p>亲爱的 <strong>${vars.hrbp_name}</strong>，</p>
      <p>员工 <strong>${vars.employee_name}</strong> 的试用期评估已完成。</p>
      <p style="padding: 12px; background-color: #f6ffed; border-left: 4px solid #52c41a; color: #666;">
        <strong>评估结果：</strong>${vars.eval_result}<br>
        <strong>上级评价人：</strong>${vars.manager_name}
      </p>
      <p>请及时登录试用期管理系统，确认评估结果并发起转正审批流程。</p>
      <div style="text-align: center;">
        <a href="${vars.login_url}" target="_blank" class="email-button">前往发起审批</a>
      </div>
    `
  },

  // --- 5. 审批流程 ---
  {
    id: '08_approval_todo_approver',
    title: '【待办】请审批员工转正申请',
    role: '上级',
    defaultVars: {
      approver_name: '李总',
      employee_name: '王明辉',
      department: '产品研发部',
      position: '高级前端工程师',
      hire_date: '2025-02-01',
      eval_summary: '该员工试用期间表现优秀，各项指标均达到预期。',
      login_url: `${baseUrl}/auth/token?token=mock_token_approver&redirect=/approval/pending`
    },
    renderBody: (vars) => `
      <p>亲爱的 <strong>${vars.approver_name}</strong>，</p>
      <p>以下员工的转正申请已提交至您处，请审批：</p>
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <tr>
          <td style="padding: 8px 12px; background-color: #fafafa; border: 1px solid #f0f0f0; font-weight: 500;">员工姓名</td>
          <td style="padding: 8px 12px; border: 1px solid #f0f0f0;">${vars.employee_name}</td>
        </tr>
        <tr>
          <td style="padding: 8px 12px; background-color: #fafafa; border: 1px solid #f0f0f0; font-weight: 500;">所属部门</td>
          <td style="padding: 8px 12px; border: 1px solid #f0f0f0;">${vars.department}</td>
        </tr>
        <tr>
          <td style="padding: 8px 12px; background-color: #fafafa; border: 1px solid #f0f0f0; font-weight: 500;">岗位</td>
          <td style="padding: 8px 12px; border: 1px solid #f0f0f0;">${vars.position}</td>
        </tr>
        <tr>
          <td style="padding: 8px 12px; background-color: #fafafa; border: 1px solid #f0f0f0; font-weight: 500;">入职日期</td>
          <td style="padding: 8px 12px; border: 1px solid #f0f0f0;">${vars.hire_date}</td>
        </tr>
      </table>
      <p style="padding: 12px; background-color: #f6ffed; border-left: 4px solid #52c41a; color: #666;">
        <strong>评估摘要：</strong><br>
        ${vars.eval_summary}
      </p>
      <p>请及时登录试用期管理系统进行审批处理。</p>
      <div style="text-align: center;">
        <a href="${vars.login_url}" target="_blank" class="email-button">前往审批</a>
      </div>
    `
  }
];
