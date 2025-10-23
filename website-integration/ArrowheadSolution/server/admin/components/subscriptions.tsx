import React, { useEffect, useState } from 'react'
import { Box, H2, Table, TableRow, TableCell, TableHead, TableBody, Text, Badge, Icon } from '@adminjs/design-system'
import { ApiClient } from 'adminjs'

const api = new ApiClient()

type Subscription = {
  id: number
  userId: number
  userEmail: string
  stripeCustomerId: string | null
  stripeSubscriptionId: string | null
  stripePriceId: string | null
  status: string
  planName: string | null
  currentPeriodStart: string | null
  currentPeriodEnd: string | null
  cancelAtPeriodEnd: boolean
  createdAt: string
  updatedAt: string
}

const statusColors: Record<string, string> = {
  none: 'default',
  active: 'success',
  canceled: 'danger',
  past_due: 'error',
  trialing: 'info',
}

const SubscriptionsPage: React.FC = () => {
  const [rows, setRows] = useState<Subscription[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getPage({ pageName: 'Subscriptions' })
      .then((res) => {
        const rows = (res.data as { rows?: unknown } | undefined)?.rows
        const normalized: Subscription[] = Array.isArray(rows) ? (rows as Subscription[]) : []
        setRows(normalized)
        setLoading(false)
      })
      .catch((err) => {
        console.error('Failed to load subscriptions', err)
        setLoading(false)
      })
  }, [])

  const formatDate = (date: string | null) => {
    if (!date) return '-'
    return new Date(date).toLocaleDateString()
  }

  const getStripeLink = (customerId: string | null, subscriptionId: string | null) => {
    if (!customerId && !subscriptionId) return null
    
    // Determine if using test or live mode (test IDs start with test_)
    const isTest = (customerId || subscriptionId || '').includes('test')
    const baseUrl = isTest ? 'https://dashboard.stripe.com/test' : 'https://dashboard.stripe.com'
    
    if (subscriptionId) {
      return `${baseUrl}/subscriptions/${subscriptionId}`
    }
    if (customerId) {
      return `${baseUrl}/customers/${customerId}`
    }
    return null
  }

  if (loading) {
    return (
      <Box variant="container" width={1} p="lg">
        <H2>Subscriptions</H2>
        <Text mt="lg">Loading...</Text>
      </Box>
    )
  }

  return (
    <Box variant="container" width={1} p="lg">
      <H2>User Subscriptions</H2>
      <Text color="grey60" mt="sm" mb="lg">
        View and manage user subscription data. Read-only mode.
      </Text>
      
      <Table mt="lg">
        <TableHead>
          <TableRow>
            <TableCell>User</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Plan</TableCell>
            <TableCell>Period End</TableCell>
            <TableCell>Stripe</TableCell>
            <TableCell>Created</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((sub) => {
            const stripeLink = getStripeLink(sub.stripeCustomerId, sub.stripeSubscriptionId)
            return (
              <TableRow key={sub.id}>
                <TableCell>
                  <Text fontWeight="bold">{sub.userEmail}</Text>
                  <Text fontSize="sm" color="grey60">ID: {sub.userId}</Text>
                </TableCell>
                <TableCell>
                  <Badge variant={statusColors[sub.status] || 'default'}>
                    {sub.status}
                  </Badge>
                  {sub.cancelAtPeriodEnd && (
                    <Text fontSize="sm" color="warning" mt="xs">
                      ⚠️ Canceling
                    </Text>
                  )}
                </TableCell>
                <TableCell>
                  {sub.planName || <Text color="grey60">-</Text>}
                </TableCell>
                <TableCell>
                  {formatDate(sub.currentPeriodEnd)}
                </TableCell>
                <TableCell>
                  {stripeLink ? (
                    <a
                      href={stripeLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: '#5469d4', textDecoration: 'none' }}
                    >
                      View in Stripe →
                    </a>
                  ) : (
                    <Text color="grey60">-</Text>
                  )}
                </TableCell>
                <TableCell>
                  {formatDate(sub.createdAt)}
                </TableCell>
              </TableRow>
            )
          })}
          {rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={6}>
                <Text>No subscriptions found</Text>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      
      <Box mt="lg">
        <Text fontSize="sm" color="grey60">
          Total subscriptions: {rows.length}
        </Text>
      </Box>
    </Box>
  )
}

export default SubscriptionsPage
