import type { QueryClient } from '@tanstack/react-query'
import { projectsApi, type ProjectDetail, type ProjectTask } from './api'

/** What `apply` hands back so a failed request can put the screen back as it was. */
export type Rollback = { previous?: ProjectDetail }

/**
 * Changes on the project page show at once instead of after the server has answered and the whole project has been
 * fetched again (which takes seconds on a slow connection and looks like nothing happened):
 *
 *  1. `apply` puts the change on the screen immediately;
 *  2. the request goes to the server in the background;
 *  3. if it fails, `rollback` restores the screen (the mutation's error is shown as before);
 *  4. `settle` always asks the server for the real state afterwards, so the screen ends up matching the server
 *     whatever happened (progress, dates and counts the server works out itself).
 *
 * Usage in a mutation:  onMutate: (v) => optimistic.apply(...),  onError: (_e, _v, c) => optimistic.rollback(c),
 *                       onSettled: optimistic.settle
 */
export function optimisticProject(queryClient: QueryClient, projectId: string) {
  const key = projectsApi.detailQuery(projectId).queryKey
  return {
    async apply(change: (project: ProjectDetail) => ProjectDetail): Promise<Rollback> {
      // A fetch already in flight would overwrite the change with the old state when it lands.
      await queryClient.cancelQueries({ queryKey: key, exact: true })
      const previous = queryClient.getQueryData<ProjectDetail>(key)
      if (previous) queryClient.setQueryData<ProjectDetail>(key, change(previous))
      return { previous }
    },
    rollback(context: Rollback | undefined) {
      if (context?.previous) queryClient.setQueryData<ProjectDetail>(key, context.previous)
    },
    settle: () => queryClient.invalidateQueries({ queryKey: ['projects', projectId] }),
  }
}

/** The server's rule (ProjectService.recalculateProjectProgress): progress is the share of tasks completed. */
export function withTasks(project: ProjectDetail, tasks: ProjectTask[]): ProjectDetail {
  const progressPercentage =
    tasks.length === 0
      ? project.progressPercentage
      : Math.round((tasks.filter((task) => task.status === 'COMPLETED').length / tasks.length) * 100)
  return { ...project, tasks, progressPercentage }
}
