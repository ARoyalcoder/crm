import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { FormDialog } from '@/components/shared/FormDialog'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { DOCUMENT_CATEGORIES, documentKeys, uploadDocument } from '../api'
import { FilePicker } from './FilePicker'

const schema = z.object({
  title: z.string().trim().min(1, 'Give the document a title').max(255, 'Maximum 255 characters'),
  category: z.string().min(1),
  description: z.string(),
  tags: z.string(),
})
type FormValues = z.infer<typeof schema>

type DocumentUploadModalProps = {
  entityType: string
  entityId: string
  onClose: () => void
}

/** Files a document against a record: the file, what to call it, and what kind of document it is. */
export function DocumentUploadModal({ entityType, entityId, onClose }: DocumentUploadModalProps) {
  const queryClient = useQueryClient()
  const [file, setFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { title: '', category: 'OTHER', description: '', tags: '' } })

  const upload = useMutation({
    mutationFn: (values: FormValues) =>
      uploadDocument({
        file: file!,
        entityType,
        entityId,
        category: values.category,
        title: values.title.trim(),
        description: values.description.trim() || undefined,
        tags: values.tags.trim() || undefined,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: documentKeys.all })
      onClose()
    },
  })

  const submit = form.handleSubmit((values) => {
    if (!file) {
      setFileError('Choose the file to upload')
      return
    }
    upload.mutate(values)
  })

  return (
    <Form {...form}>
      <FormDialog
        open
        onOpenChange={(open) => (open ? undefined : onClose())}
        title="Upload a document"
        description="Filed against this record, with earlier versions kept."
        submitLabel="Upload"
        onSubmit={submit}
        submitting={upload.isPending}
        error={upload.error}
      >
        <FilePicker
          file={file}
          error={fileError}
          onError={setFileError}
          onChange={(selected) => {
            setFile(selected)
            // Name the document after the file until the person chooses a name of their own.
            if (selected && !form.getValues('title')) form.setValue('title', selected.name.replace(/\.[^/.]+$/, ''), { shouldValidate: true })
          }}
        />
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input maxLength={255} placeholder="Signed contract" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Kind of document</FormLabel>
              <FormControl>
                <Select {...field}>
                  {DOCUMENT_CATEGORIES.map((category) => (
                    <option key={category.value} value={category.value}>
                      {category.label}
                    </option>
                  ))}
                </Select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea rows={2} placeholder="Anything worth knowing about this file" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="tags"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tags</FormLabel>
              <FormControl>
                <Input placeholder="approved, final" {...field} />
              </FormControl>
              <FormDescription>Separate with commas.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </FormDialog>
    </Form>
  )
}
