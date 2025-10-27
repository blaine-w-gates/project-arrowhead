/**
 * Invite Member Modal
 * 
 * Allows managers to send invitation emails to team members
 * 
 * PRD v5.2 Section 3.1: Team Member Invitations
 */

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface TeamMember {
  id: string;
  name: string;
}

interface InviteMemberModalProps {
  open: boolean;
  onClose: () => void;
  memberId: string;
  member: TeamMember;
  teamId: string;
}

export function InviteMemberModal({
  open,
  onClose,
  memberId,
  member,
  teamId,
}: InviteMemberModalProps) {
  const queryClient = useQueryClient();
  const [email, setEmail] = useState('');

  const inviteMutation = useMutation({
    mutationFn: async (emailAddress: string) => {
      const response = await fetch(`/api/team-members/${memberId}/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ email: emailAddress }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to send invitation');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-members', teamId] });
      setEmail('');
      onClose();
    },
  });

  const handleSend = () => {
    if (email.trim() && email.includes('@')) {
      inviteMutation.mutate(email.trim());
    }
  };

  const handleClose = () => {
    setEmail('');
    inviteMutation.reset();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Send Invitation to {member?.name}</DialogTitle>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {inviteMutation.error && (
            <Alert variant="destructive">
              <AlertDescription>
                {inviteMutation.error.message}
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              placeholder="colleague@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={inviteMutation.isPending}
            />
            <p className="text-xs text-muted-foreground">
              An invitation email will be sent to this address
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={inviteMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSend}
            disabled={!email.trim() || !email.includes('@') || inviteMutation.isPending}
          >
            {inviteMutation.isPending ? 'Sending...' : 'Send Invitation'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
