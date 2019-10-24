/** @jsx JSXSlack.h */
import { JSXSlack } from '../jsx'
import { ObjectOutput } from '../utils'
import {
  BlockComponentProps,
  BlocksInternal,
  blockTypeSymbol,
  InternalBlockType,
} from './Blocks'

export interface HomeProps {
  callbackId?: string
  children: JSXSlack.Children<BlockComponentProps>
  externalId?: string
  privateMetadata?: string
}

/** [experimental] */
export const Home: JSXSlack.FC<HomeProps> = props => {
  // TODO: Use type definition to validate output
  return (
    <ObjectOutput
      type="home"
      callback_id={props.callbackId}
      external_id={props.externalId}
      private_metadata={props.privateMetadata}
      blocks={JSXSlack(
        <BlocksInternal
          {...{ [blockTypeSymbol]: InternalBlockType.Home }}
          children={props.children}
        />
      )}
    />
  )
}