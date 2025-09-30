import React, { useEffect, useState } from 'react'
import { Box, H2, Table, TableRow, TableCell, TableHead, TableBody, Text } from '@adminjs/design-system'
import { ApiClient } from 'adminjs'

const api = new ApiClient()

type AdminUser = {
  id: number
  email: string
  role: string
  isActive: boolean
  lastLogin: string | null
  createdAt: string
}

const AdminUsersPage: React.FC = () => {
  const [rows, setRows] = useState<AdminUser[]>([])

  useEffect(() => {
    api.getPage({ pageName: 'Admin Users' })
      .then((res) => setRows(((res.data as any)?.rows || []) as AdminUser[]))
      .catch((err) => console.error('Failed to load admin users', err))
  }, [])

  return (
    <Box variant="container" width={1} p="lg">
      <H2>Admin Users</H2>
      <Table mt="lg">
        <TableHead>
          <TableRow>
            <TableCell>ID</TableCell>
            <TableCell>Email</TableCell>
            <TableCell>Role</TableCell>
            <TableCell>Active</TableCell>
            <TableCell>Last Login</TableCell>
            <TableCell>Created</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((u) => (
            <TableRow key={u.id}>
              <TableCell>{u.id}</TableCell>
              <TableCell>{u.email}</TableCell>
              <TableCell>{u.role}</TableCell>
              <TableCell>{u.isActive ? 'Yes' : 'No'}</TableCell>
              <TableCell>{u.lastLogin ? new Date(u.lastLogin).toLocaleString() : '-'}</TableCell>
              <TableCell>{new Date(u.createdAt).toLocaleString()}</TableCell>
            </TableRow>
          ))}
          {rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={6}><Text>No admin users found</Text></TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </Box>
  )
}

export default AdminUsersPage
