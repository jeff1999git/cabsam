# @excelcabs/ui

The Excel Cabs design system: design tokens, shadcn/ui primitives (new-york style, Tailwind v4,
`radix-ui`) and a few domain-agnostic composites. The package ships TypeScript source (no build
step); `apps/web` compiles it via `transpilePackages`.

- **Imports:** always use a deep path, e.g. `@excelcabs/ui/components/button`. There is no barrel
  file.
- **Framework-free:** nothing in this package imports `next/*` or app code (`@/…`). Links, routing
  and domain mapping (status → tone + label) stay in the app. Slots such as `PageHeader.back` or
  `EmptyState.action` take the app's `<Link>`.
- **Toasts:** import `toast` from `@excelcabs/ui/components/sonner`, never from `sonner` itself, so
  every caller shares one toast store.
- **Tokens** (`styles/globals.css`): `primary` (deep blue) plus `primary-soft`; `success`,
  `warning`, `info` and `destructive`, each with a `-soft` background; `muted`, `accent` and
  `border`; `shadow-card` and `shadow-elevated`; and `rounded-xl` for cards. Use tokens such as
  `bg-success-soft text-success`, never raw palette colours.
- **Responsive:** tables appear only from `md` up and cards below it (`ResponsiveTable`). Dialogs
  are full width with a 1rem margin on mobile. Form controls use 16px text below `md`, which stops
  iOS from zooming in.
- **Scroll containers:** a `Table` scrolls inside its own `overflow-x-auto` box. Give flex and grid
  ancestors `min-w-0`, or the table will widen the page.

## API index

<!-- api-index:start -->

| Import path | Exports | Purpose & key props |
| --- | --- | --- |
| `components/button` | `Button`, `buttonVariants`, `ButtonProps` | `variant`: default, destructive, outline, secondary, ghost, link. `size`: default (40px), sm, lg (48px, for mobile primary actions), icon, icon-sm. `loading` shows a spinner, disables the button and sets `aria-busy`. `asChild` renders a `<Link>`; with `loading` or `disabled` it sets `aria-disabled`. |
| `components/spinner` | `Spinner` | Spinning `LoaderCircle` with `role="status"` and `aria-label="Loading"`. Override `aria-label` to say what is loading. |
| `components/input` | `Input` | Text input, 40px tall, `aria-invalid` styling. |
| `components/textarea` | `Textarea` | Auto-growing textarea (`field-sizing-content`). |
| `components/label` | `Label` | Radix label. |
| `components/native-select` | `NativeSelect`, `NativeSelectOption`, `NativeSelectOptGroup` | **The default select for forms and filters** (the phone's native picker). `size`: sm or default. `className` goes on the wrapper and sets the width (full width by default). |
| `components/select` | `Select`, `SelectTrigger`, `SelectValue`, `SelectContent`, `SelectItem`, `SelectGroup`, `SelectLabel`, `SelectSeparator`, `SelectScroll{Up,Down}Button` | Radix listbox. Use it only where a custom-rendered option is needed. |
| `components/field` | `Field`, `FieldLabel`, `FieldDescription`, `FieldError`, `FieldGroup`, `FieldSet`, `FieldLegend`, `FieldContent`, `FieldTitle`, `FieldSeparator` | shadcn Field layout for forms. `Field` takes `orientation` (vertical, horizontal or responsive) and `data-invalid`. `FieldError` takes `errors={[fieldState.error]}` or `children`, and renders nothing when there are no errors. Use it with RHF `<Controller>`. |
| `components/card` | `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardAction`, `CardContent`, `CardFooter` | White `rounded-xl` card with a border and `shadow-card`. `CardAction` is the header's top-right slot. |
| `components/badge` | `Badge`, `badgeVariants` | Small label. `variant`: default, secondary, destructive, outline. For statuses use `StatusBadge`. |
| `components/alert` | `Alert`, `AlertTitle`, `AlertDescription`, `alertVariants` | Inline banner. `variant`: default, info, success, warning, destructive (soft tints). Put a lucide icon first. Warning and destructive use `role="alert"`; the others use `role="status"`. |
| `components/dialog` | `Dialog`, `DialogTrigger`, `DialogContent`, `DialogHeader`, `DialogFooter`, `DialogTitle`, `DialogDescription`, `DialogClose`, `DialogOverlay`, `DialogPortal` | Modal. On mobile the content is full width minus a 1rem margin; from `sm` it is `max-w-lg`. It scrolls internally (`max-h: 100dvh − 2rem`). `showCloseButton` defaults to true. In the footer, buttons stack below `sm`. |
| `components/alert-dialog` | `AlertDialog`, `AlertDialogTrigger`, `AlertDialogContent`, `AlertDialogHeader`, `AlertDialogFooter`, `AlertDialogTitle`, `AlertDialogDescription`, `AlertDialogAction`, `AlertDialogCancel`, `AlertDialogOverlay`, `AlertDialogPortal` | Blocking confirmation. `Action` and `Cancel` take the Button `variant` and `size`. Usually you want `ConfirmDialog` instead. |
| `components/sheet` | `Sheet`, `SheetTrigger`, `SheetContent`, `SheetHeader`, `SheetBody`, `SheetFooter`, `SheetTitle`, `SheetDescription`, `SheetClose`, `SheetOverlay`, `SheetPortal` | Side panel. `side`: left, right (the default), top or bottom. Left and right sheets are ¾ width on mobile and `sm:max-w-sm` above; widen with `className="w-full sm:max-w-lg"`. `SheetBody` is the scrolling middle. |
| `components/dropdown-menu` | `DropdownMenu`, `DropdownMenuTrigger`, `DropdownMenuContent`, `DropdownMenuItem`, `DropdownMenuLabel`, `DropdownMenuSeparator`, `DropdownMenuGroup`, `DropdownMenuCheckboxItem`, `DropdownMenuRadioGroup`, `DropdownMenuRadioItem`, `DropdownMenuShortcut`, `DropdownMenuSub`, `DropdownMenuSubTrigger`, `DropdownMenuSubContent`, `DropdownMenuPortal` | Menus, such as the account menu or row actions. `DropdownMenuItem` takes `variant="destructive"`, `inset` and `asChild` (for links). |
| `components/table` | `Table`, `TableHeader`, `TableBody`, `TableFooter`, `TableRow`, `TableHead`, `TableCell`, `TableCaption` | Semantic table inside an `overflow-x-auto` container. |
| `components/tabs` | `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent` | Radix tabs. The list is full width on mobile, with equal-width triggers. |
| `components/skeleton` | `Skeleton` | Pulsing placeholder block (`aria-hidden`). Size it with classes. |
| `components/separator` | `Separator` | 1px rule. `orientation`: horizontal or vertical. |
| `components/avatar` | `Avatar`, `AvatarImage`, `AvatarFallback` | Round avatar. Its fallback is styled for initials: `<AvatarFallback>{getInitials(name)}</AvatarFallback>`. |
| `components/tooltip` | `Tooltip`, `TooltipTrigger`, `TooltipContent`, `TooltipProvider` | Hover and focus hint. It brings its own provider, and the delay is 200ms. |
| `components/sonner` | `Toaster`, `toast` | Toast outlet (mount once in the providers) and the `toast()` API. |
| `composites/page-header` | `PageHeader` | The page `<h1>`. Props: `title`, `description?`, `actions?` (they wrap under the title on mobile) and `back?` (a slot for a back link). |
| `composites/section` | `Section` | A `<section>` labelled by its `<h2>`. Props: `title`, `description?`, `actions?`, `children`. |
| `composites/empty-state` | `EmptyState` | Centered, muted "nothing here" panel. Props: `icon?` (an element), `title`, `description?`, `action?`. `variant` is outline (dashed card, the default) or plain (inside a card). |
| `composites/error-state` | `ErrorState` | Load-failure panel. Props: `title?`, `message?`, `onRetry?` (shows a "Try again" button), `retryLabel?`, `retrying?` (spinner on the button). |
| `composites/stat-card` | `StatCard`, `StatCardTone` | Dashboard figure. Props: `label`, `value`, `icon?`, `hint?`, and `tone?` for the icon chip: neutral, primary (the default), success, warning or danger. |
| `composites/status-badge` | `StatusBadge`, `StatusTone` | Soft pill: `tone` is neutral, info, success, warning, danger or muted. Also takes `dot?` and `children` (the label). The app maps domain statuses to a tone and label. |
| `composites/confirm-dialog` | `ConfirmDialog` | Controlled confirm. Props: `open`, `onOpenChange`, `title`, `description` (inline content), `confirmLabel`, `cancelLabel?`, `tone?` (default or destructive), `onConfirm`, `pending?`, `children?` (extra body). **If `onConfirm` returns a promise** (e.g. `mutateAsync`), the dialog stays pending until it settles. It closes on success and stays open on rejection, so the caller shows the error. While pending it cannot be dismissed. |
| `composites/form-dialog` | `FormDialog` | Create and edit dialog shell. Props: `open`, `onOpenChange`, `title`, `description?`, `formId`, `submitLabel`, `cancelLabel?`, `pending?`, `submitDisabled?`, `className?`. Render `<form id={formId}>` as `children`. The header and footer stay fixed while the body scrolls, and it is full width on mobile. A backdrop click does not close it, and nothing closes it while `pending`. |
| `composites/data-table` | `ResponsiveTable`, `ResponsiveTableColumn`, `ResponsiveTableProps` | Generic list: a `<Table>` from `md` up and `renderCard(row)` cards below it. Props: `columns` (`{ id, header, cell(row), className?, headerClassName? }[]`), `rows`, `getRowKey`, `renderCard`, `onRowClick?` (row click, plus Enter/Space; clicks on inner links and buttons are ignored), `loading?` and `loadingRows?` (skeletons), `empty?`, `caption?` (screen-reader only). Both layouts are rendered and switched with CSS, so in e2e tests query by role, which skips hidden elements. |
| `composites/detail-list` | `DetailList`, `DetailListItem` | A `<dl>` of label and value pairs. `items` is `{ label, value, fullWidth? }[]`, and `columns` is 1 or 2 (two columns from `sm`). |
| `composites/stepper` | `Stepper` | Horizontal step indicator: `steps: string[]` and a 0-based `current`, with `aria-current="step"`. Navy filled current step, soft upcoming steps; all labels stay visible, so keep them to one word. |
| `composites/pagination-bar` | `PaginationBar` | Shows "N results · Page x of y" with Previous and Next. Props: `page` (1-based), `pageCount`, `total`, `onPageChange`, `pending?`. |
| `composites/search-input` | `SearchInput` | Controlled search field with an icon and a clear button (`aria-label` "Clear search", returns focus to the input). Props: `value`, `onValueChange`, `clearLabel?`, and the usual input props. Give it an `aria-label`. `className` goes on the wrapper. |
| `hooks/use-media-query` | `useMediaQuery(query)` | `useSyncExternalStore` over `matchMedia`. It returns `false` on the server and during hydration, so prefer CSS breakpoints. |
| `hooks/use-is-mobile` | `useIsMobile()`, `MOBILE_BREAKPOINT_PX` | `true` below 768px (`md`). |
| `hooks/use-debounced-value` | `useDebouncedValue(value, delayMs = 300)` | Debounces a value, for example search text before it goes into a query key. |
| `lib/utils` | `cn(...classes)` | `clsx` + `tailwind-merge`. |
| `lib/initials` | `getInitials(name)` | "Arjun Nair" → "AN". |
| `lib/styles` | `controlClassName`, `overlayClassName`, `closeButtonClassName`, `eyebrowClassName` | Class recipes shared by the primitives, plus the small uppercase label style. Use them for a custom control that must match the kit. |
| `globals.css` | — | Tailwind entry and tokens. The app's `globals.css` imports it. |

<!-- api-index:end -->

## Visual language

- **Brand**: a single navy primary (`--primary: #0f2b8c`) with soft tints (`--primary-soft`,
  `--primary-soft-strong`) for secondary actions, selected rows and info pills. Rebrand by changing
  the primary family in `src/styles/globals.css`.
- **Controls** are filled (`bg-field`, no border until hover/focus) and 44px tall on touch screens.
  `Input` and `NativeSelect` accept a leading `icon`.
- **Buttons**: `default` (navy), `soft` (tinted secondary), `outline`, `ghost`, `destructive`,
  `link`; `size="lg"` (48px) for primary calls to action.
- **Labels**: `eyebrowClassName` (`@excelcabs/ui/lib/styles`) for small uppercase field labels.
- **Surfaces**: white `Card`s (`rounded-xl`, subtle border, `shadow-card`) on a cool off-white page.
