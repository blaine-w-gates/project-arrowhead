import React, { useEffect, useState } from 'react'
import { Box, H2, Text, Table, TableRow, TableCell, TableHead, TableBody, ValueGroup, Section } from '@adminjs/design-system'
import { ApiClient } from 'adminjs'

const api = new ApiClient()

type AuditLog = {
  id: number
  adminId: number
  action: string
  resource: string
  resourceId: string | null
  ipAddress: string | null
  createdAt: string
}

type DashboardData = {
  counts: {
    users: number
    blogPosts: number
    sessions: number
    tasks: number
    subscriptions: number
  }
  recentAudit: AuditLog[]
}

const Dashboard: React.FC = () => {
  const [data, setData] = useState<DashboardData>({ counts: { users: 0, blogPosts: 0, sessions: 0, tasks: 0, subscriptions: 0 }, recentAudit: [] })

  useEffect(() => {
    api.getDashboard().then((res) => {
      setData(res.data as DashboardData)
    }).catch((err) => {
      console.error('Failed to load dashboard data', err)
    })
  }, [])

  return (
    <Box variant="container" width={1} p="lg">
      <H2>Project Arrowhead — Admin Dashboard</H2>
      <Text mt="md" mb="xl">Local development metrics</Text>

      <Section>
        <Box flex flexDirection="row" flexWrap="wrap" gap="xl">
          <ValueGroup label="Users" value={String(data.counts.users)} />
          <ValueGroup label="Subscriptions" value={String(data.counts.subscriptions)} />
          <ValueGroup label="Blog Posts" value={String(data.counts.blogPosts)} />
          <ValueGroup label="Sessions" value={String(data.counts.sessions)} />
          <ValueGroup label="Tasks" value={String(data.counts.tasks)} />
        </Box>
      </Section>

      <Section mt="xl">
        <H2>Recent Admin Activity</H2>
        <Table mt="lg">
          <TableHead>
            <TableRow>
              <TableCell>When</TableCell>
              <TableCell>Admin</TableCell>
              <TableCell>Action</TableCell>
              <TableCell>Resource</TableCell>
              <TableCell>Resource ID</TableCell>
              <TableCell>IP</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.recentAudit.map((row) => (
              <TableRow key={row.id}>
                <TableCell>{new Date(row.createdAt).toLocaleString()}</TableCell>
                <TableCell>#{row.adminId}</TableCell>
                <TableCell>{row.action}</TableCell>
                <TableCell>{row.resource}</TableCell>
                <TableCell>{row.resourceId || '-'}</TableCell>
                <TableCell>{row.ipAddress || '-'}</TableCell>
              </TableRow>
            ))}
            {data.recentAudit.length === 0 && (
              <TableRow>
                <TableCell colSpan={6}><Text>No recent entries</Text></TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Section>
    </Box>
  )
}

export default Dashboard
