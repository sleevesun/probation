export const psDecisionColor = (decision?: string) => {
  if (decision === '不符合录用条件') return '#d14343'
  if (decision === '超出预期') return '#2f6f58'
  return '#b36a00'
}

export const psEvalTypeLabel = (type: string) => {
  const map: Record<string, string> = {
    self: '员工自评',
    manager: '直属主管评价',
    hrbp: 'HRBP评价',
    invited: '邀评记录'
  }
  return map[type] || type
}

export const psStatusText = (status: string) => {
  const map: Record<string, string> = {
    '01': '待设定目标',
    '02': '目标待确认',
    '03': '目标已确认',
    '04': '待发起流程',
    '05': '待员工自评',
    '06': '评估阶段',
    '08': '审批阶段',
    '09': '待发布结果',
    '10': '已完成',
    '99': '已挂起'
  }
  return map[status] || status
}
