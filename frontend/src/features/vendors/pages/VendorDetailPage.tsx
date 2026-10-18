import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Mail, Pencil, Phone, Plus, Star, Trash2, UserRound, Users } from 'lucide-react'
import { useParams, Link } from 'react-router-dom'
import { ErrorState } from '@/components/feedback/ErrorState'
import { PageHeader } from '@/components/layout/PageHeader'
import { ConfirmationDialog } from '@/components/shared/ConfirmationDialog'
import { EmptyState } from '@/components/shared/EmptyState'
import { SkeletonLoader } from '@/components/shared/SkeletonLoader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useHasPermission } from '@/features/auth/auth-context'
import { DocumentList } from '@/features/documents/components/DocumentList'
import { formatDate } from '@/lib/format'
import { useListParams } from '@/lib/use-list-params'
import {
  VENDOR_DOCUMENT_TYPES,
  deleteVendorContact,
  deleteVendorDocument,
  labelOf,
  scorecardQuery,
  vendorContactsQuery,
  vendorDocumentsQuery,
  vendorKeys,
  vendorQuery,
  type VendorContact,
  type VendorDocument,
} from '../api'
import { ScorecardWidget } from '../components/ScorecardWidget'
import { ContactDialog, RateVendorDialog } from '../components/VendorDialogs'
import { VendorStatusBadge } from '../components/VendorStatusBadge'

const TABS = ['overview', 'scorecard', 'documents'] as const
type TabKey = (typeof TABS)[number]

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-0.5 sm:grid-cols-[9rem_1fr] sm:gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words whitespace-pre-line">{children}</dd>
    </div>
  )
}

/** One vendor: who they are and who to call, how they have been rated, and their documents. */
export function VendorDetailPage() {
  const { id } = useParams<{ id: string }>()
  const vendorId = id!
  const params = useListParams()
  const queryClient = useQueryClient()
  const canUpdate = useHasPermission('VENDOR_UPDATE')
  const canScore = useHasPermission('VENDOR_SCORE')
  const canSeeDocuments = useHasPermission('DOCUMENT_VIEW')

  const requested = params.get('tab')
  const tab: TabKey = (TABS as readonly string[]).includes(requested) ? (requested as TabKey) : 'overview'

  const [editingContact, setEditingContact] = useState<VendorContact | null | undefined>(undefined)
  const [removingContact, setRemovingContact] = useState<VendorContact | null>(null)
  const [removingRecord, setRemovingRecord] = useState<VendorDocument | null>(null)
  const [rating, setRating] = useState(false)

  const vendor = useQuery(vendorQuery(vendorId))
  const contacts = useQuery({ ...vendorContactsQuery(vendorId), enabled: tab === 'overview' })
  const scorecard = useQuery({ ...scorecardQuery(vendorId), enabled: tab === 'scorecard' })
  const records = useQuery({ ...vendorDocumentsQuery(vendorId), enabled: tab === 'documents' })

  const removeContact = useMutation({
    mutationFn: (contact: VendorContact) => deleteVendorContact(contact.id, vendorId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: vendorKeys.contacts(vendorId) })
      setRemovingContact(null)
    },
    onError: () => setRemovingContact(null),
  })
  const removeRecord = useMutation({
    mutationFn: (record: VendorDocument) => deleteVendorDocument(record.id, vendorId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: vendorKeys.documents(vendorId) })
      setRemovingRecord(null)
    },
    onError: () => setRemovingRecord(null),
  })

  if (vendor.isPending) return <SkeletonLoader variant="page" label="Loading the vendor" />
  if (vendor.isError) return <ErrorState title="Could not load this vendor" error={vendor.error} onRetry={() => void vendor.refetch()} />
  const data = vendor.data

  return (
    <div className="grid gap-4">
      <PageHeader
        title={data.companyName}
        back={{ to: '/vendors', label: 'Vendors' }}
        meta={<VendorStatusBadge status={data.status} />}
        description={
          <span className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <a href={`mailto:${data.contactEmail}`} className="inline-flex items-center gap-1.5 underline-offset-2 hover:underline">
              <Mail className="size-4" aria-hidden="true" />
              {data.contactEmail}
            </a>
            <a href={`tel:${data.contactPhone}`} className="inline-flex items-center gap-1.5 underline-offset-2 hover:underline">
              <Phone className="size-4" aria-hidden="true" />
              {data.contactPhone}
            </a>
          </span>
        }
        action={
          canUpdate ? (
            <Button variant="outline" asChild>
              <Link to={`/vendors/${vendorId}/edit`}>
                <Pencil aria-hidden="true" />
                Edit
              </Link>
            </Button>
          ) : null
        }
      />

      <Tabs variant="line" value={tab} onValueChange={(next) => params.set('tab', next === 'overview' ? '' : next)}>
        <TabsList aria-label="Vendor sections">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="scorecard">Scorecard</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid items-start gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Details</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="grid gap-3 text-sm">
                  <Fact label="Address">{data.address ?? '—'}</Fact>
                  <Fact label="Supplies">{data.services ?? '—'}</Fact>
                  <Fact label="Payment terms">{data.paymentTermsDays != null ? `Net ${data.paymentTermsDays} days` : '—'}</Fact>
                  <Fact label="Notes">{data.notes ?? '—'}</Fact>
                  <Fact label="Added">
                    {formatDate(data.createdAt)}
                    <span className="block truncate text-xs text-muted-foreground" title={data.createdBy}>
                      by {data.createdBy}
                    </span>
                  </Fact>
                </dl>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Contacts</CardTitle>
                {canUpdate ? (
                  <CardAction>
                    <Button size="sm" variant="outline" onClick={() => setEditingContact(null)}>
                      <Plus aria-hidden="true" />
                      Add contact
                    </Button>
                  </CardAction>
                ) : null}
              </CardHeader>
              <CardContent>
                {removeContact.isError ? <ErrorState title="That contact could not be removed" error={removeContact.error} variant="compact" className="mb-3" /> : null}
                {contacts.isPending ? (
                  <SkeletonLoader variant="list" count={2} label="Loading contacts" />
                ) : contacts.isError ? (
                  <ErrorState title="Could not load the contacts" error={contacts.error} onRetry={() => void contacts.refetch()} variant="compact" />
                ) : contacts.data.length === 0 ? (
                  <EmptyState variant="compact" icon={Users} title="No contacts yet" description={canUpdate ? 'Add the people you deal with at this vendor.' : undefined} />
                ) : (
                  <ul className="divide-y">
                    {contacts.data.map((contact) => (
                      <li key={contact.id} className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
                        <div className="grid min-w-0 gap-0.5 text-sm">
                          <span className="flex flex-wrap items-center gap-2 font-medium">
                            <UserRound className="size-4 text-muted-foreground" aria-hidden="true" />
                            {contact.name}
                            {contact.primaryContact ? <Badge variant="primary">Main contact</Badge> : null}
                          </span>
                          {contact.designation ? <span className="text-muted-foreground">{contact.designation}</span> : null}
                          <span className="text-muted-foreground">
                            <a href={`mailto:${contact.email}`} className="underline-offset-2 hover:underline">
                              {contact.email}
                            </a>{' '}
                            ·{' '}
                            <a href={`tel:${contact.phone}`} className="underline-offset-2 hover:underline">
                              {contact.phone}
                            </a>
                          </span>
                        </div>
                        {canUpdate ? (
                          <div className="flex shrink-0 gap-1">
                            <Button variant="ghost" size="icon" aria-label={`Edit ${contact.name}`} onClick={() => setEditingContact(contact)}>
                              <Pencil aria-hidden="true" />
                            </Button>
                            <Button variant="ghost" size="icon" aria-label={`Remove ${contact.name}`} onClick={() => setRemovingContact(contact)}>
                              <Trash2 aria-hidden="true" />
                            </Button>
                          </div>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="scorecard">
          <Card className="max-w-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="size-4 text-primary" aria-hidden="true" />
                Performance scorecard
              </CardTitle>
              {canScore ? (
                <CardAction>
                  <Button size="sm" variant="outline" onClick={() => setRating(true)}>
                    Rate this vendor
                  </Button>
                </CardAction>
              ) : null}
            </CardHeader>
            <CardContent>
              {scorecard.isError ? <ErrorState title="Could not load the scorecard" error={scorecard.error} onRetry={() => void scorecard.refetch()} variant="compact" /> : <ScorecardWidget scorecard={scorecard.data} isLoading={scorecard.isPending} />}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents">
          <div className="grid gap-4">
            {canSeeDocuments ? (
              <Card>
                <CardContent>
                  <DocumentList entityType="VENDOR" entityId={vendorId} />
                </CardContent>
              </Card>
            ) : (
              <p className="text-sm text-muted-foreground">Your role cannot see documents.</p>
            )}

            {records.data && records.data.length > 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle>Earlier file records</CardTitle>
                </CardHeader>
                <CardContent>
                  {removeRecord.isError ? <ErrorState title="That record could not be removed" error={removeRecord.error} variant="compact" className="mb-3" /> : null}
                  <ul className="divide-y">
                    {records.data.map((record) => (
                      <li key={record.id} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                        <span className="grid gap-0.5 text-sm">
                          <span className="font-medium">{record.fileName}</span>
                          <span className="text-xs text-muted-foreground">
                            {labelOf(VENDOR_DOCUMENT_TYPES, record.documentType)} · {formatDate(record.createdAt)}
                          </span>
                        </span>
                        {canUpdate ? (
                          <Button variant="ghost" size="icon" aria-label={`Remove the record of ${record.fileName}`} onClick={() => setRemovingRecord(record)}>
                            <Trash2 aria-hidden="true" />
                          </Button>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ) : null}
          </div>
        </TabsContent>
      </Tabs>

      {editingContact !== undefined ? <ContactDialog vendorId={vendorId} contact={editingContact} onClose={() => setEditingContact(undefined)} /> : null}
      {rating ? <RateVendorDialog vendorId={vendorId} onClose={() => setRating(false)} /> : null}
      <ConfirmationDialog
        open={removingContact !== null}
        onOpenChange={(open) => (open ? undefined : setRemovingContact(null))}
        title="Remove this contact?"
        description={removingContact ? `${removingContact.name} will no longer be listed for this vendor.` : undefined}
        confirmLabel="Remove"
        destructive
        pending={removeContact.isPending}
        onConfirm={() => removingContact && removeContact.mutate(removingContact)}
      />
      <ConfirmationDialog
        open={removingRecord !== null}
        onOpenChange={(open) => (open ? undefined : setRemovingRecord(null))}
        title="Remove this file record?"
        description={removingRecord ? `The record of “${removingRecord.fileName}” will be removed.` : undefined}
        confirmLabel="Remove"
        destructive
        pending={removeRecord.isPending}
        onConfirm={() => removingRecord && removeRecord.mutate(removingRecord)}
      />
    </div>
  )
}
