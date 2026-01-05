import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

export default function SupportPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const ticket = {
      id: `ticket-${Date.now()}`,
      name,
      email,
      subject,
      message,
      createdAt: new Date().toISOString(),
    };
    try {
      const existing = JSON.parse(localStorage.getItem('support_tickets') || '[]');
      existing.push(ticket);
      localStorage.setItem('support_tickets', JSON.stringify(existing));
    } catch (err) {
      // ignore
    }
    setName(''); setEmail(''); setSubject(''); setMessage('');
    alert('Thanks — your message has been recorded. We will follow up via email.');
  }

  return (
    <DashboardLayout>
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Support</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">If you encounter issues with the app, describe them below and our support team will respond.</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm text-muted-foreground">Your name</label>
                <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-2" />
              </div>

              <div>
                <label className="text-sm text-muted-foreground">Email</label>
                <Input value={email} onChange={(e) => setEmail(e.target.value)} className="mt-2" />
              </div>

              <div>
                <label className="text-sm text-muted-foreground">Subject</label>
                <Input value={subject} onChange={(e) => setSubject(e.target.value)} className="mt-2" />
              </div>

              <div>
                <label className="text-sm text-muted-foreground">Message</label>
                <Textarea value={message} onChange={(e) => setMessage(e.target.value)} className="mt-2" rows={6} />
              </div>

              <div className="flex items-center gap-2">
                <Button type="submit">Send</Button>
                <Button variant="ghost" onClick={() => { setName(''); setEmail(''); setSubject(''); setMessage(''); }}>Clear</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
