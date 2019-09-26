/** @jsx JSXSlack.h */
import {
  Select as SlackSelect,
  StaticSelect,
  MultiSelect,
  MultiStaticSelect,
  MultiExternalSelect,
  MultiChannelsSelect,
  MultiConversationsSelect,
  MultiUsersSelect,
  ChannelsSelect as SlackChannelsSelect,
  ConversationsSelect as SlackConversationsSelect,
  ExternalSelect as SlackExternalSelect,
  Option as SlackOption,
  UsersSelect as SlackUsersSelect,
} from '@slack/types'
import flattenDeep from 'lodash.flattendeep'
import { ConfirmProps } from '../composition/Confirm'
import { JSXSlack } from '../../jsx'
import {
  ObjectOutput,
  PlainText,
  coerceToInteger,
  isNode,
  wrap,
} from '../../utils'

export interface SingleSelectPropsBase {
  actionId?: string
  confirm?: JSXSlack.Node<ConfirmProps>
  maxSelectedItems?: undefined
  multiple?: false
  placeholder?: string
}

export interface MultiSelectPropsBase
  extends Omit<SingleSelectPropsBase, 'maxSelectedItems' | 'multiple'> {
  maxSelectedItems?: number
  multiple: true
}

type SelectPropsBase = SingleSelectPropsBase | MultiSelectPropsBase

// Fragments
interface SelectFragmentProps {
  children?: JSXSlack.Children<OptionInternal | OptgroupInternal>
}

// Static select
type StaticSelectPropsBase = Required<SelectFragmentProps>

interface SingleSelectProps
  extends SingleSelectPropsBase,
    StaticSelectPropsBase {
  value?: string
}

interface MultiSelectProps extends MultiSelectPropsBase, StaticSelectPropsBase {
  value?: string | string[]
}

type SelectProps = SingleSelectProps | MultiSelectProps

// External select
interface ExternalSelectPropsBase {
  children?: undefined
  minQueryLength?: number
}

type ExternalSelectInitialOption = JSXSlack.Node<OptionInternal> | SlackOption

interface SingleExternalSelectProps
  extends SingleSelectPropsBase,
    ExternalSelectPropsBase {
  initialOption?: ExternalSelectInitialOption
}

interface MultiExternalSelectProps
  extends MultiSelectPropsBase,
    ExternalSelectPropsBase {
  initialOption?: ExternalSelectInitialOption | ExternalSelectInitialOption[]
}

type ExternalSelectProps = SingleExternalSelectProps | MultiExternalSelectProps

// Users select
interface SingleUsersSelectProps extends SingleSelectPropsBase {
  initialUser?: string
  children?: undefined
}

interface MultiUsersSelectProps extends MultiSelectPropsBase {
  initialUser?: string | string[]
  children?: undefined
}

type UsersSelectProps = SingleUsersSelectProps | MultiUsersSelectProps

// Conversations select
interface SingleConversationsSelectProps extends SingleSelectPropsBase {
  initialConversation?: string
  children?: undefined
}

interface MultiConversationsSelectProps extends MultiSelectPropsBase {
  initialConversation?: string | string[]
  children?: undefined
}

type ConversationsSelectProps =
  | SingleConversationsSelectProps
  | MultiConversationsSelectProps

// Channels select
interface SingleChannelsSelectProps extends SingleSelectPropsBase {
  initialChannel?: string
  children?: undefined
}

interface MultiChannelsSelectProps extends MultiSelectPropsBase {
  initialChannel?: string | string[]
  children?: undefined
}

type ChannelsSelectProps = SingleChannelsSelectProps | MultiChannelsSelectProps

// Options
interface OptionProps {
  value: string
  children: JSXSlack.Children<{}>
}

interface OptgroupProps {
  label: string
  children: JSXSlack.Children<OptionInternal>
}

export interface OptionInternal extends OptionProps {
  type: 'option'
  text: string
}

export interface OptgroupInternal extends OptgroupProps {
  type: 'optgroup'
}

type SelectFragmentObject<T extends 'options' | 'option_groups'> = Required<
  Pick<StaticSelect, T>
>

const baseProps = (
  props: SelectPropsBase
):
  | Pick<SlackSelect, 'action_id' | 'confirm' | 'placeholder'>
  | Pick<
      MultiSelect,
      'action_id' | 'confirm' | 'placeholder' | 'max_selected_items'
    > => ({
  action_id: props.actionId,
  confirm: props.confirm ? JSXSlack(props.confirm) : undefined,
  max_selected_items: props.maxSelectedItems,
  placeholder: props.placeholder
    ? {
        type: 'plain_text',
        text: props.placeholder,
        emoji: true, // TODO: Controlable emoji
      }
    : undefined,
})

const createOption = ({ value, text }: OptionInternal): SlackOption => ({
  value,
  text: { text, type: 'plain_text', emoji: true }, // TODO: Controlable emoji
})

const filter = <T extends {}>(children: JSXSlack.Children<T>) =>
  JSXSlack.normalizeChildren(children).filter(
    o => typeof o !== 'string'
  ) as JSXSlack.Node<T>[]

const generateFragments = (
  children: SelectFragmentProps['children']
): SelectFragmentObject<'options' | 'option_groups'> => {
  const fragment: SelectFragmentObject<'options' | 'option_groups'> = JSXSlack(
    <SelectFragment children={children} />
  )

  if (fragment.options && fragment.options.length === 0)
    throw new Error(
      'Component for selection must include least of one <Option> or <Optgroup>.'
    )

  return fragment
}

export const SelectFragment: JSXSlack.FC<SelectFragmentProps> = props => {
  const opts = filter(props.children)

  if (opts.length === 0)
    return <ObjectOutput<SelectFragmentObject<'options'>> options={[]} />

  const { type } = opts[0].props
  if (!opts.every(o => o.props.type === type))
    throw new Error(
      'Component for selection must only include either of <Option> and <Optgroup>.'
    )

  switch (type) {
    case 'option':
      return (
        <ObjectOutput<SelectFragmentObject<'options'>>
          options={(opts as JSXSlack.Node<OptionInternal>[]).map(n =>
            createOption(n.props)
          )}
        />
      )
    case 'optgroup':
      return (
        <ObjectOutput<SelectFragmentObject<'option_groups'>>
          option_groups={
            (opts as JSXSlack.Node<OptgroupInternal>[]).map(n => ({
              label: {
                type: 'plain_text',
                text: n.props.label,
                emoji: true, // TODO: Controlable emoji
              },
              options: filter(n.props.children).map(o => createOption(o.props)),
            })) as any
          }
        />
      )
    default:
      throw new Error(`Unexpected option type: ${type}`)
  }
}

export const Select: JSXSlack.FC<SelectProps> = props => {
  const fragment = generateFragments(props.children)

  // Find initial option(s)
  const initialOptions: SlackOption[] = []
  const opts: SlackOption[] =
    fragment.options ||
    flattenDeep(fragment.option_groups.map(og => og.options))

  for (const target of wrap(props.value || [])) {
    const found = opts.find(o => o.value === target)
    if (found) initialOptions.push(found)
  }

  if (props.multiple) {
    return (
      <ObjectOutput<MultiStaticSelect>
        type="multi_static_select"
        {...baseProps(props)}
        initial_options={initialOptions.length > 0 ? initialOptions : undefined}
        {...fragment}
      />
    )
  }

  return (
    <ObjectOutput<StaticSelect>
      type="static_select"
      {...baseProps(props)}
      initial_option={initialOptions.length > 0 ? initialOptions[0] : undefined}
      {...fragment}
    />
  )
}

export const ExternalSelect: JSXSlack.FC<ExternalSelectProps> = props => {
  const minQueryLength = coerceToInteger(props.minQueryLength)
  const initialOptions = props.initialOption
    ? wrap(props.initialOption).map(opt =>
        isNode<OptionInternal>(opt) ? createOption(opt.props) : opt
      )
    : []

  if (props.multiple) {
    return (
      <ObjectOutput<MultiExternalSelect>
        type="multi_external_select"
        {...baseProps(props)}
        initial_options={initialOptions.length > 0 ? initialOptions : undefined}
        min_query_length={minQueryLength}
      />
    )
  }

  return (
    <ObjectOutput<SlackExternalSelect>
      type="external_select"
      {...baseProps(props)}
      initial_option={initialOptions.length > 0 ? initialOptions[0] : undefined}
      min_query_length={minQueryLength}
    />
  )
}

export const UsersSelect: JSXSlack.FC<UsersSelectProps> = props =>
  props.multiple ? (
    <ObjectOutput<MultiUsersSelect>
      type="multi_users_select"
      {...baseProps(props)}
      initial_users={props.initialUser ? wrap(props.initialUser) : undefined}
    />
  ) : (
    <ObjectOutput<SlackUsersSelect>
      type="users_select"
      {...baseProps(props)}
      initial_user={props.initialUser}
    />
  )

export const ConversationsSelect: JSXSlack.FC<
  ConversationsSelectProps
> = props =>
  props.multiple ? (
    <ObjectOutput<MultiConversationsSelect>
      type="multi_conversations_select"
      {...baseProps(props)}
      initial_conversations={
        props.initialConversation ? wrap(props.initialConversation) : undefined
      }
    />
  ) : (
    <ObjectOutput<SlackConversationsSelect>
      type="conversations_select"
      {...baseProps(props)}
      initial_conversation={props.initialConversation}
    />
  )

export const ChannelsSelect: JSXSlack.FC<ChannelsSelectProps> = props =>
  props.multiple ? (
    <ObjectOutput<MultiChannelsSelect>
      type="multi_channels_select"
      {...baseProps(props)}
      initial_channels={
        props.initialChannel ? wrap(props.initialChannel) : undefined
      }
    />
  ) : (
    <ObjectOutput<SlackChannelsSelect>
      type="channels_select"
      {...baseProps(props)}
      initial_channel={props.initialChannel}
    />
  )

export const Option: JSXSlack.FC<OptionProps> = props => (
  <ObjectOutput<OptionInternal>
    {...props}
    type="option"
    text={JSXSlack(<PlainText>{props.children}</PlainText>)}
  />
)

export const Optgroup: JSXSlack.FC<OptgroupProps> = props => (
  <ObjectOutput<OptgroupInternal> {...props} type="optgroup" />
)
