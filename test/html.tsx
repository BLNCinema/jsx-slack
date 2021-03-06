/** @jsx JSXSlack.h */
import html from '../src/html'
import JSXSlack, { Fragment } from '../src/index'

beforeEach(() => JSXSlack.exactMode(false))

describe('HTML parser for mrkdwn', () => {
  // https://api.slack.com/messaging/composing/formatting#escaping
  describe('Escape entity', () => {
    it('replaces "&" with "&amp;"', () => {
      expect(html('&&&')).toBe('&amp;&amp;&amp;')
      expect(html('&heart;')).toBe('&amp;heart;')
    })

    it('allows double escaping', () => {
      expect(html('true &amp;& false')).toBe('true &amp;amp;&amp; false')
      expect(html('A&lt;=&gt;B')).toBe('A&amp;lt;=&amp;gt;B')
    })

    it('replaces "<" with "&lt;"', () => expect(html('a<2')).toBe('a&lt;2'))
    it('replaces ">" with "&gt;"', () => expect(html('b>0')).toBe('b&gt;0'))

    it('does not conflict element-like string with internals', () => {
      expect(html('<br />')).toBe('&lt;br /&gt;')
      expect(html('<<pre:0>>')).toBe('&lt;&lt;pre:0&gt;&gt;')
    })
  })

  describe('HTML entities', () => {
    it('decodes HTML entities passed as JSX', () =>
      expect(html(<i>&hearts;</i>)).toBe('_\u2665_'))

    it('re-encodes special characters in Slack', () =>
      expect(html(<i>&lt;&amp;&gt;</i>)).toBe('_&lt;&amp;&gt;_'))

    it('does not decode HTML entities passed as string literal', () => {
      expect(html(<i>{'&hearts;'}</i>)).toBe('_&amp;hearts;_')
      expect(html(<i>{'&lt;&amp;&gt;'}</i>)).toBe('_&amp;lt;&amp;amp;&amp;gt;_')
      expect(html(<i>&lt;{'<mixed>'}&gt;</i>)).toBe('_&lt;&lt;mixed&gt;&gt;_')
    })

    it('keeps special spaces around the content', () => {
      expect(
        html(
          <i>
            {'  '}test{'  '}
          </i>
        )
      ).toBe('_test_')
      expect(html(<i>&#9;&#9;tab&#9;&#9;</i>)).toBe('_tab_')
      expect(
        html(<i>&thinsp;&nbsp;&ensp;&emsp;sp&emsp;&ensp;&nbsp;&thinsp;</i>)
      ).toBe('_\u2009\u00a0\u2002\u2003sp\u2003\u2002\u00a0\u2009_')
    })
  })

  describe('Italic', () => {
    it('replaces <i> tag to italic markup', () =>
      expect(html(<i>Hello</i>)).toBe('_Hello_'))

    it('replaces <em> tag to italic markup', () =>
      expect(html(<em>Hello</em>)).toBe('_Hello_'))

    it('allows containing the other markup', () =>
      expect(
        html(
          <i>
            Hello, <b>World</b>!
          </i>
        )
      ).toBe('_Hello, *World*!_'))

    it('ignores invalid double markup', () =>
      expect(
        html(
          <i>
            <i>Double</i>
          </i>
        )
      ).toBe('_Double_'))

    it('allows containing underscore by using fallback of date formatting', () => {
      expect(html(<i>italic_text</i>)).toBe(
        '_italic<!date^00000000^{_}|_>text_'
      )

      // Full-width underscore (Alternative for italic markup)
      expect(html(<i>Hello, ＿World＿!</i>)).toBe(
        '_Hello, <!date^00000000^{_}|＿>World<!date^00000000^{_}|＿>!_'
      )
    })

    it('replaces underscore with similar character within hyperlink', () => {
      expect(
        html(
          <a href="https://example.com/">
            <i>_test_</i>
          </a>
        )
      ).toBe('<https://example.com/|_\u02cdtest\u02cd_>')

      expect(
        html(
          <i>
            <a href="https://example.com/">_test_</a>
          </i>
        )
      ).toBe('_<https://example.com/|\u02cdtest\u02cd>_')

      expect(
        html(
          <a href="https://example.com/">
            <i>＿test＿</i>
          </a>
        )
      ).toBe('<https://example.com/|_\u2e0ftest\u2e0f_>')

      expect(
        html(
          <i>
            <a href="https://example.com/">＿test＿</a>
          </i>
        )
      ).toBe('_<https://example.com/|\u2e0ftest\u2e0f>_')
    })

    it('does not escape underscore contained in valid emoji shorthand', () => {
      expect(html(<i>:arrow_down:</i>)).toBe('_:arrow_down:_')
      expect(html(<i>:絵＿文字:</i>)).toBe('_:絵＿文字:_')
    })

    it('does not escape underscore contained in valid link', () => {
      expect(
        html(
          <i>
            <a href="https://example.com/a_b_c">_link_</a>
          </i>
        )
      ).toBe('_<https://example.com/a_b_c|\u02cdlink\u02cd>_')
    })

    it('does not escape underscore contained in valid time formatting', () => {
      // NOTE: Fallback text will render as plain text even if containing character for formatting
      expect(
        html(
          <i>
            <time datetime={1234567890} fallback="fall_back">
              {'{date_num} {time_secs}'}
            </time>
          </i>
        )
      ).toBe('_<!date^1234567890^{date_num} {time_secs}|fall_back>_')
    })

    it('applies markup per each lines when text has multiline', () => {
      expect(
        html(
          <i>
            foo
            <br />
            bar
          </i>
        )
      ).toBe('_foo_\n_bar_')

      expect(
        html(
          <i>
            <p>foo</p>
            <p>bar</p>
          </i>
        )
      ).toBe('_foo_\n\n_bar_')
    })

    it('inserts invisible spaces around markup chars when rendered in exact mode', () => {
      JSXSlack.exactMode(true)
      expect(html(<i>Hello</i>)).toBe('\u200b_\u200bHello\u200b_\u200b')
    })
  })

  describe('Bold', () => {
    it('replaces <b> tag to bold markup', () =>
      expect(html(<b>Hello</b>)).toBe('*Hello*'))

    it('replaces <strong> tag to bold markup', () =>
      expect(html(<strong>Hello</strong>)).toBe('*Hello*'))

    it('allows containing the other markup', () =>
      expect(
        html(
          <b>
            Hello, <i>World</i>!
          </b>
        )
      ).toBe('*Hello, _World_!*'))

    it('ignores invalid double markup', () =>
      expect(
        html(
          <b>
            <b>Double</b>
          </b>
        )
      ).toBe('*Double*'))

    it('allows containing asterisk by using fallback of date formatting', () => {
      expect(html(<b>bold*text</b>)).toBe('*bold<!date^00000000^{_}|*>text*')

      // Full-width asterisk (Alternative for bold markup)
      expect(html(<b>Hello, ＊World＊!</b>)).toBe(
        '*Hello, <!date^00000000^{_}|＊>World<!date^00000000^{_}|＊>!*'
      )
    })

    it('replaces asterisk with similar character within hyperlink', () => {
      expect(
        html(
          <a href="https://example.com/">
            <b>*test*</b>
          </a>
        )
      ).toBe('<https://example.com/|*\u2217test\u2217*>')

      expect(
        html(
          <b>
            <a href="https://example.com/">*test*</a>
          </b>
        )
      ).toBe('*<https://example.com/|\u2217test\u2217>*')

      expect(
        html(
          <a href="https://example.com/">
            <b>＊test＊</b>
          </a>
        )
      ).toBe('<https://example.com/|*\ufe61test\ufe61*>')

      expect(
        html(
          <b>
            <a href="https://example.com/">＊test＊</a>
          </b>
        )
      ).toBe('*<https://example.com/|\ufe61test\ufe61>*')
    })

    it('applies markup per each lines when text has multiline', () => {
      expect(
        html(
          <b>
            foo
            <br />
            bar
          </b>
        )
      ).toBe('*foo*\n*bar*')

      expect(
        html(
          <b>
            <p>foo</p>
            <p>bar</p>
          </b>
        )
      ).toBe('*foo*\n\n*bar*')
    })

    it('inserts invisible spaces around markup chars when rendered in exact mode', () => {
      JSXSlack.exactMode(true)
      expect(html(<b>Hello</b>)).toBe('\u200b*\u200bHello\u200b*\u200b')
    })
  })

  describe('Strikethrough', () => {
    it('replaces <s> tag to strikethrough markup', () =>
      expect(html(<s>Hello</s>)).toBe('~Hello~'))

    it('replaces <strike> tag to strikethrough markup', () =>
      expect(html(<strike>Hello</strike>)).toBe('~Hello~'))

    it('replaces <del> tag to strikethrough markup', () =>
      expect(html(<del>Hello</del>)).toBe('~Hello~'))

    it('allows containing the other markup', () =>
      expect(
        html(
          <s>
            Hello, <b>World</b>!
          </s>
        )
      ).toBe('~Hello, *World*!~'))

    it('ignores invalid double markup', () =>
      expect(
        html(
          <s>
            <s>Double</s>
          </s>
        )
      ).toBe('~Double~'))

    it('allows containing tilde by using fallback of date formatting', () =>
      expect(html(<s>strike~through</s>)).toBe(
        '~strike<!date^00000000^{_}|~>through~'
      ))

    it('replaces tilde with tilde operatpr within hyperlink', () => {
      expect(
        html(
          <a href="https://example.com/">
            <s>~strikethrough~</s>
          </a>
        )
      ).toBe('<https://example.com/|~\u223cstrikethrough\u223c~>')

      expect(
        html(
          <s>
            <a href="https://example.com/">~strikethrough~</a>
          </s>
        )
      ).toBe('~<https://example.com/|\u223cstrikethrough\u223c>~')
    })

    it('applies markup per each lines when text has multiline', () => {
      expect(
        html(
          <s>
            foo
            <br />
            bar
          </s>
        )
      ).toBe('~foo~\n~bar~')

      expect(
        html(
          <s>
            <p>foo</p>
            <p>bar</p>
          </s>
        )
      ).toBe('~foo~\n\n~bar~')
    })

    it('inserts invisible spaces around markup chars when rendered in exact mode', () => {
      JSXSlack.exactMode(true)
      expect(html(<s>Hello</s>)).toBe('\u200b~\u200bHello\u200b~\u200b')
    })
  })

  describe('Inline code', () => {
    it('replaces <code> tag to inline code markup', () => {
      expect(html(<code>Inline code</code>)).toBe('`Inline code`')
      expect(html(<code>*allow* _using_ ~markup~</code>)).toBe(
        '`*allow* _using_ ~markup~`'
      )
    })

    it('renders HTML special characters correctly', () =>
      expect(html(<code>{'<abbr title="and">&</abbr>'}</code>)).toBe(
        '`&lt;abbr title="and"&gt;&amp;&lt;/abbr&gt;`'
      ))

    it('ignores invalid double markup', () =>
      expect(
        html(
          <code>
            <code>Double</code>
          </code>
        )
      ).toBe('`Double`'))

    it('does never apply nested markup', () =>
      expect(
        html(
          <code>
            <b>bold</b> <i>italic</i> <s>strikethrough</s>
          </code>
        )
      ).toBe('`bold italic strikethrough`'))

    it('allows containing backtick by using fallback of date formatting', () => {
      expect(html(<code>`code`</code>)).toBe(
        '`<!date^00000000^{_}|`>code<!date^00000000^{_}|`>`'
      )

      // Full-width backtick (Alternative for inline code markup)
      expect(html(<code>｀code｀</code>)).toBe(
        '`<!date^00000000^{_}|｀>code<!date^00000000^{_}|｀>`'
      )
    })

    it('replaces backtick with similar character within hyperlink', () => {
      expect(
        html(
          <a href="https://example.com/">
            <code>`code`</code>
          </a>
        )
      ).toBe('<https://example.com/|`\u02cbcode\u02cb`>')

      expect(
        html(
          <code>
            <a href="https://example.com/">`code`</a>
          </code>
        )
      ).toBe('`<https://example.com/|\u02cbcode\u02cb>`')

      expect(
        html(
          <a href="https://example.com/">
            <code>｀code｀</code>
          </a>
        )
      ).toBe('<https://example.com/|`\u02cbcode\u02cb`>')

      expect(
        html(
          <code>
            <a href="https://example.com/">｀code｀</a>
          </code>
        )
      ).toBe('`<https://example.com/|\u02cbcode\u02cb>`')
    })

    it('applies markup per each lines when code has multiline', () => {
      expect(
        html(
          <code>
            foo
            <br />
            bar
          </code>
        )
      ).toBe('`foo`\n`bar`')

      expect(
        html(
          <code>
            foo
            <br />
            <br />
            bar
          </code>
        )
      ).toBe('`foo`\n\n`bar`')
    })

    it('allows containing link', () => {
      expect(
        html(
          <Fragment>
            <code>
              <a href="https://example.com/">{'<example>'}</a>
            </code>
            <br />
            <code>
              <a href="@channel" />
            </code>
          </Fragment>
        )
      ).toBe('`<https://example.com/|&lt;example&gt;>`\n`<!channel|channel>`')
    })

    it('allows containing time tag for localization', () => {
      expect(
        html(
          <code>
            <time datetime="1552212000">{'{date_num}'}</time>
          </code>
        )
      ).toBe('`<!date^1552212000^{date_num}|2019-03-10>`')
    })

    it('inserts invisible spaces around markup chars when rendered in exact mode', () => {
      JSXSlack.exactMode(true)
      expect(html(<code>code</code>)).toBe('\u200b`\u200bcode\u200b`\u200b')
    })
  })

  describe('Line break', () => {
    it('replaces <br> tag to line break', () =>
      expect(
        html(
          <Fragment>
            Hello,
            <br />
            <br />
            <br />
            World!
          </Fragment>
        )
      ).toBe('Hello,\n\n\nWorld!'))
  })

  describe('Paragraph', () => {
    it('has no differences between 1 paragraph and plain rendering', () =>
      expect(html(<p>Hello!</p>)).toBe(html('Hello!')))

    it('makes a blank like between paragraphs', () => {
      expect(
        html(
          <Fragment>
            <p>Hello!</p>
            <p>World!</p>
          </Fragment>
        )
      ).toBe('Hello!\n\nWorld!')

      // Combination with plain text
      expect(
        html(
          <Fragment>
            A<p>B</p>C
          </Fragment>
        )
      ).toBe('A\n\nB\n\nC')
    })

    it('ignores invalid double markup', () =>
      expect(
        html(
          <p>
            <p>Double</p>
          </p>
        )
      ).toBe('Double'))
  })

  describe('Blockquote', () => {
    it('makes a blank like between blockquotes', () => {
      expect(
        html(
          <Fragment>
            <blockquote>Hello!</blockquote>
            <blockquote>World!</blockquote>
          </Fragment>
        )
      ).toBe('&gt; Hello!\n&gt; \n\n&gt; World!\n&gt; ')

      // Combination with plain text and line breaks
      expect(
        html(
          <Fragment>
            A<blockquote>B</blockquote>C
          </Fragment>
        )
      ).toBe('A\n\n&gt; B\n&gt; \n\nC')

      // Combination with paragraph
      expect(
        html(
          <Fragment>
            <p>test</p>
            <blockquote>
              <p>foo</p>
              <p>bar</p>
            </blockquote>
            <p>test</p>
          </Fragment>
        )
      ).toBe('test\n\n&gt; foo\n&gt; \n&gt; bar\n&gt; \n\ntest')

      expect(
        html(
          <b>
            <blockquote>
              <p>A</p>
              <i>B</i>
              <p>C</p>
            </blockquote>
          </b>
        )
      ).toBe('&gt; *A*\n&gt; \n&gt; *_B_*\n&gt; \n&gt; *C*\n&gt; ')
    })

    it('ignores invalid double markup', () =>
      expect(
        html(
          <blockquote>
            <blockquote>Double</blockquote>
          </blockquote>
        )
      ).toBe('&gt; Double\n&gt; '))

    it('escapes blockquote mrkdwn character by inserting soft hyphen', () =>
      expect(html(<blockquote>&gt; blockquote</blockquote>)).toBe(
        '&gt; \u00ad&gt; blockquote\n&gt; '
      ))

    it('escapes full-width quote character by using fallback of date formatting', () =>
      expect(html(<blockquote>＞blockquote</blockquote>)).toBe(
        '&gt; <!date^00000000^{_}|＞>blockquote\n&gt; '
      ))

    it('always inserts soft hyphen when included quote character within hyperlink', () => {
      expect(
        html(
          <a href="https://example.com/">
            <blockquote>&gt; blockquote</blockquote>
          </a>
        )
      ).toBe('&gt; <https://example.com/|\u00ad&gt; blockquote>\n&gt; ')

      expect(
        html(
          <blockquote>
            <a href="https://example.com/">&gt; blockquote</a>
          </blockquote>
        )
      ).toBe('&gt; <https://example.com/|\u00ad&gt; blockquote>\n&gt; ')

      expect(
        html(
          <a href="https://example.com/">
            <blockquote>＞blockquote</blockquote>
          </a>
        )
      ).toBe('&gt; <https://example.com/|\u00ad＞blockquote>\n&gt; ')

      expect(
        html(
          <blockquote>
            <a href="https://example.com/">＞blockquote</a>
          </blockquote>
        )
      ).toBe('&gt; <https://example.com/|\u00ad＞blockquote>\n&gt; ')
    })
  })

  describe('Pre-formatted text', () => {
    it('makes line break and space between around contents', () => {
      expect(
        html(
          <Fragment>
            foo<pre>{'pre\nformatted\ntext'}</pre>bar
          </Fragment>
        )
      ).toBe('foo\n```\npre\nformatted\ntext\n```\nbar')

      expect(
        html(
          <Fragment>
            <p>foo</p>
            <pre>{'pre\nformatted\ntext'}</pre>
            <p>bar</p>
          </Fragment>
        )
      ).toBe('foo\n\n```\npre\nformatted\ntext\n```\n\nbar')
    })

    it('preserves whitespaces for indent', () => {
      const preformatted = '{\n  hello\n}'
      expect(html(<pre>{preformatted}</pre>)).toBe('```\n{\n  hello\n}\n```')

      // with <a> link
      expect(
        html(
          <pre>
            {'{\n  '}
            <a href="https://example.com/">hello</a>
            {'\n}'}
          </pre>
        )
      ).toBe('```\n{\n  <https://example.com/|hello>\n}\n```')
    })

    it('allows wrapping by text format character', () =>
      expect(
        html(
          <b>
            <i>
              <pre>{'bold\nand italic'}</pre>
            </i>
          </b>
        )
      ).toBe('*_```\nbold\nand italic\n```_*'))

    it('does not apply wrapped strikethrough by Slack restriction', () =>
      expect(
        html(
          <s>
            <blockquote>
              strikethrough and
              <pre>{'quoted\ntext'}</pre>
            </blockquote>
          </s>
        )
      ).toBe('&gt; ~strikethrough and~\n&gt; ```\nquoted\ntext\n```\n&gt; '))

    it('renders HTML special characters correctly', () =>
      expect(html(<pre>{'<abbr title="and">&</abbr>'}</pre>)).toBe(
        '```\n&lt;abbr title="and"&gt;&amp;&lt;/abbr&gt;\n```'
      ))

    it('allows containing link', () => {
      expect(
        html(
          <pre>
            <a href="https://example.com/">example</a>
          </pre>
        )
      ).toBe('```\n<https://example.com/|example>\n```')

      // with format
      expect(
        html(
          <pre>
            <a href="https://example.com/">
              <b>Bold</b> link
            </a>
            <br />
            {'and plain\ntext'}
          </pre>
        )
      ).toBe('```\n<https://example.com/|*Bold* link>\nand plain\ntext\n```')
    })
  })

  describe('List', () => {
    it('converts unordered list to mimicked text', () => {
      expect(
        html(
          <ul>
            <li>a</li>
            <li>
              <b>b</b>
            </li>
            <li>c</li>
          </ul>
        )
      ).toBe('• a\n• *b*\n• c')
    })

    it('converts ordered list to plain text', () => {
      expect(
        html(
          <ol>
            <li>a</li>
            <li>b</li>
            <li>
              <code>c</code>
            </li>
          </ol>
        )
      ).toBe('1. a\n2. b\n3. `c`')
    })

    it('allows multiline content by aligned indent', () => {
      expect(
        html(
          <ul>
            <li>
              Hello, <br />
              world!
            </li>
            <li>
              <p>Paragraph</p>
              <p>supported</p>
            </li>
          </ul>
        )
      ).toBe('• Hello,\n\u2007 world!\n• Paragraph\n\u2007 \n\u2007 supported')

      expect(
        html(
          <ol>
            <li>
              Ordered
              <br />
              list
            </li>
            <li>
              <p>Well</p>
              <p>aligned</p>
            </li>
          </ol>
        )
      ).toBe('1. Ordered\n   list\n2. Well\n   \n   aligned')
    })

    it('allows setting start number via start attribute in ordered list', () => {
      expect(
        html(
          <ol start={9}>
            <li>Change</li>
            <li>
              Start
              <br />
              number
            </li>
          </ol>
        )
      ).toBe('\u20079. Change\n10. Start\n    number')

      // Coerce to integer
      expect(
        html(
          <ol start={3.5}>
            <li>test</li>
          </ol>
        )
      ).toBe(
        html(
          <ol start={3}>
            <li>test</li>
          </ol>
        )
      )
    })

    it('renders ordered number with lowercase latin alphabet when type attribute is "a"', () =>
      expect(
        html(
          <ol type={'a'} start={-1}>
            <li>-1</li>
            <li>0</li>
            <li>1</li>
            <li>2</li>
            <li>3</li>
          </ol>
        )
      ).toBe('-1. -1\n 0. 0\n  a. 1\n b. 2\n  c. 3'))

    it('renders ordered number with uppercase latin alphabet when type attribute is "A"', () => {
      expect(
        html(
          <ol type={'A'} start={25}>
            <li>25</li>
            <li>26</li>
            <li>27</li>
          </ol>
        )
      ).toBe('  Y. 25\n Z. 26\nAA. 27')

      expect(
        html(
          <ol type={'A'} start={700}>
            <li>700</li>
            <li>701</li>
            <li>702</li>
            <li>703</li>
            <li>704</li>
          </ol>
        )
      ).toBe(' ZX. 700\n ZY. 701\n  ZZ. 702\nAAA. 703\nAAB. 704')
    })

    it('renders ordered number with lowercase roman numeric when type attribute is "i"', () =>
      expect(
        html(
          <ol type={'i'} start={-1}>
            {[...Array(12)].map((_, i) => (
              <li>{i - 1}</li>
            ))}
          </ol>
        )
      ).toBe(
        ' -1. -1\n  0. 0\n  i. 1\n ii. 2\n iii. 3\n  iv. 4\n  v. 5\n  vi. 6\n vii. 7\nviii. 8\n  ix. 9\n  x. 10'
      ))

    it('renders ordered number with uppercase roman numeric when type attribute is "I"', () => {
      expect(
        html(
          <ol type={'I'} start={45}>
            {[...Array(10)].map((_, i) => (
              <li>{i + 45}</li>
            ))}
          </ol>
        )
      ).toBe(
        '  XLV. 45\n XLVI. 46\n XLVII. 47\nXLVIII. 48\n XLIX. 49\n    L. 50\n   LI. 51\n   LII. 52\n   LIII. 53\n   LIV. 54'
      )

      expect(
        html(
          <ol type={'I'} start={3991}>
            {[...Array(10)].map((_, i) => (
              <li>{i + 3991}</li>
            ))}
          </ol>
        )
      ).toBe(
        '   MMMCMXCI. 3991\n  MMMCMXCII. 3992\n  MMMCMXCIII. 3993\n MMMCMXCIV. 3994\n  MMMCMXCV. 3995\n MMMCMXCVI. 3996\n MMMCMXCVII. 3997\nMMMCMXCVIII. 3998\n MMMCMXCIX. 3999\n        4000. 4000'
      )
    })

    it('changes ordered number in the middle of list through value prop', () =>
      expect(
        html(
          <ol>
            <li>1</li>
            <li>2</li>
            <li value={100}>100</li>
            <li>101</li>
            <li>102</li>
          </ol>
        )
      ).toBe('   1. 1\n   2. 2\n100. 100\n101. 101\n102. 102'))

    it('allows sub list', () => {
      expect(
        html(
          <ul>
            <li>test</li>
            <ul>
              <li>sub-list with direct nesting</li>
            </ul>
            <li>
              <ul>
                <li>sub-list</li>
                <li>
                  and
                  <ul>
                    <li>sub-sub-list</li>
                  </ul>
                </li>
              </ul>
            </li>
          </ul>
        )
      ).toBe(
        '• test\n  ◦ sub-list with direct nesting\n• ◦ sub-list\n  ◦ and\n     ▪︎ sub-sub-list'
      )
    })

    it('allows sub ordered list', () => {
      expect(
        html(
          <ol start={2}>
            <li>test</li>
            <ol>
              <li>sub-list with direct nesting</li>
            </ol>
            <li>
              <ol>
                <li>sub-list</li>
                <li>
                  and
                  <ul>
                    <li>sub-sub-list</li>
                  </ul>
                </li>
              </ol>
            </li>
          </ol>
        )
      ).toBe(
        '2. test\n   1. sub-list with direct nesting\n3. 1. sub-list\n   2. and\n      ▪︎ sub-sub-list'
      )
    })

    it('does not allow unsupported block components', () => {
      expect(
        html(
          <ul>
            <li>
              <pre>pre</pre>
            </li>
            <li>
              <blockquote>blockquote</blockquote>
            </li>
          </ul>
        )
      ).toBe('• pre\n• blockquote')
    })
  })

  describe('Link and mention', () => {
    it('converts <a> tag to mrkdwn link format', () => {
      expect(html(<a href="https://example.com/">Example</a>)).toBe(
        '<https://example.com/|Example>'
      )
      expect(html(<a href="mailto:mail@example.com">E-mail</a>)).toBe(
        '<mailto:mail@example.com|E-mail>'
      )
    })

    it('allows using elements inside <a> tag', () => {
      expect(
        html(
          <a href="https://example.com/">
            <i>with</i> <b>text</b> <s>formatting</s>
          </a>
        )
      ).toBe('<https://example.com/|_with_ *text* ~formatting~>')

      expect(
        html(
          <a href="https://example.com/">
            <pre>{'Link\npre-formatted\ntext'}</pre>
          </a>
        )
      ).toBe('<https://example.com/|```Link pre-formatted text```>')

      // Apply link to the content if wrapped in block element
      expect(
        html(
          <a href="https://example.com/">
            <blockquote>
              Link blockquote
              <br />
              (Single line only)
            </blockquote>
          </a>
        )
      ).toBe(
        '&gt; <https://example.com/|Link blockquote (Single line only)>\n&gt; '
      )
    })

    it('does not allow multiline contents to prevent breaking link', () =>
      expect(
        html(
          <a href="https://example.com/">
            Ignore
            <br />
            multiline
          </a>
        )
      ).toBe('<https://example.com/|Ignore multiline>'))

    it('is distributed to each content if wrapped in block elements', () =>
      expect(
        html(
          <a href="https://example.com/">
            text
            <p>paragraph</p>
            <blockquote>blockquote</blockquote>
          </a>
        )
      ).toBe(
        '<https://example.com/|text>\n\n<https://example.com/|paragraph>\n\n&gt; <https://example.com/|blockquote>\n&gt; '
      ))

    it('escapes chars in URL by percent encoding', () =>
      expect(
        html(<a href='https://example.com/?regex="<(i|em)>"'>escape test</a>)
      ).toBe('<https://example.com/?regex=%22%3C(i%7Cem)%3E%22|escape test>'))

    it('renders as plain text if href is empty', () =>
      expect(html(<a href="">empty</a>)).toBe('empty'))

    it('converts to channel link when referenced public channel ID', () => {
      expect(html(<a href="#C0123ABCD" />)).toBe('<#C0123ABCD>')
      expect(html(<a href="#CLONGERCHANNELID" />)).toBe('<#CLONGERCHANNELID>')
      expect(html(<a href="#CWXYZ9876">Ignore contents</a>)).toBe(
        '<#CWXYZ9876>'
      )
      expect(
        html(
          <b>
            <a href="#C0123ABCD" />
          </b>
        )
      ).toBe('*<#C0123ABCD>*')
    })

    it('converts to user mention when referenced user ID', () => {
      expect(html(<a href="@U0123ABCD" />)).toBe('<@U0123ABCD>')
      expect(html(<a href="@ULONGERUSERID" />)).toBe('<@ULONGERUSERID>')
      expect(html(<a href="@WGLOBALID" />)).toBe('<@WGLOBALID>')
      expect(html(<a href="@UWXYZ9876">Ignore contents</a>)).toBe(
        '<@UWXYZ9876>'
      )
      expect(
        html(
          <i>
            <a href="@U0123ABCD" />
          </i>
        )
      ).toBe('_<@U0123ABCD>_')
    })

    it('converts to user group mention when referenced subteam ID', () => {
      expect(html(<a href="@S0123ABCD" />)).toBe('<!subteam^S0123ABCD>')
      expect(html(<a href="@SLONGERSUBTEAMID" />)).toBe(
        '<!subteam^SLONGERSUBTEAMID>'
      )
      expect(html(<a href="@SWXYZ9876">Ignore contents</a>)).toBe(
        '<!subteam^SWXYZ9876>'
      )
      expect(
        html(
          <s>
            <a href="@S0123ABCD" />
          </s>
        )
      ).toBe('~<!subteam^S0123ABCD>~')
    })

    it('converts special mentions', () => {
      expect(html(<a href="@here" />)).toBe('<!here|here>')
      expect(html(<a href="@channel" />)).toBe('<!channel|channel>')
      expect(html(<a href="@everyone" />)).toBe('<!everyone|everyone>')
      expect(html(<a href="@here">Ignore contents</a>)).toBe('<!here|here>')
      expect(
        html(
          <b>
            <i>
              <a href="@here" />
            </i>
          </b>
        )
      ).toBe('*_<!here|here>_*')
    })
  })

  describe('Time localization', () => {
    const today = new Date()
    const yesterday = new Date(today.getTime() - 86400000)
    const tomorrow = new Date(today.getTime() + 86400000)

    it('converts <time> tag to mrkdwn format', () => {
      expect(
        html(
          <time datetime="1552212000" fallback="fallback">
            {'{date_num}'}
          </time>
        )
      ).toBe('<!date^1552212000^{date_num}|fallback>')
    })

    it('generates UTC fallback text from content if fallback attr is not defined', () => {
      // 1552212000 => 2019-03-10 10:00:00 UTC (= 02:00 PST = 03:00 PDT)
      expect(html(<time datetime={1552212000}>{'{date_num}'}</time>)).toBe(
        '<!date^1552212000^{date_num}|2019-03-10>'
      )

      expect(html(<time datetime={1552212000}>{'{date}'}</time>)).toBe(
        '<!date^1552212000^{date}|March 10th, 2019>'
      )

      expect(html(<time datetime={1552212000}>{'{date_short}'}</time>)).toBe(
        '<!date^1552212000^{date_short}|Mar 10, 2019>'
      )

      expect(html(<time datetime={1552212000}>{'{date_long}'}</time>)).toBe(
        '<!date^1552212000^{date_long}|Sunday, March 10th, 2019>'
      )

      expect(html(<time datetime={1552212000}>{'{time}'}</time>)).toBe(
        '<!date^1552212000^{time}|10:00 AM>'
      )

      expect(html(<time datetime={1552212000}>{'{time_secs}'}</time>)).toBe(
        '<!date^1552212000^{time_secs}|10:00:00 AM>'
      )

      // HTML entities
      expect(
        html(<time datetime={1552212000}>&lt;{'{date_num}'}&gt;</time>)
      ).toBe('<!date^1552212000^&lt;{date_num}&gt;|&lt;2019-03-10&gt;>')

      expect(
        html(<time datetime={1552212000}>&#123;date_num&#125; &hearts;</time>)
      ).toBe('<!date^1552212000^{date_num} \u2665|2019-03-10 \u2665>')
    })

    test.each`
      datetime     | format                      | contain
      ${today}     | ${'{date_pretty}'}          | ${'Today'}
      ${today}     | ${'{date_short_pretty}'}    | ${'Today'}
      ${today}     | ${'{date_long_pretty}'}     | ${'Today'}
      ${today}     | ${'At {date_pretty}'}       | ${'At today'}
      ${today}     | ${'At {date_short_pretty}'} | ${'At today'}
      ${today}     | ${'At {date_long_pretty}'}  | ${'At today'}
      ${yesterday} | ${'{date_pretty}'}          | ${'Yesterday'}
      ${yesterday} | ${'{date_short_pretty}'}    | ${'Yesterday'}
      ${yesterday} | ${'{date_long_pretty}'}     | ${'Yesterday'}
      ${yesterday} | ${'At {date_pretty}'}       | ${'At yesterday'}
      ${yesterday} | ${'At {date_short_pretty}'} | ${'At yesterday'}
      ${yesterday} | ${'At {date_long_pretty}'}  | ${'At yesterday'}
      ${tomorrow}  | ${'{date_pretty}'}          | ${'Tomorrow'}
      ${tomorrow}  | ${'{date_short_pretty}'}    | ${'Tomorrow'}
      ${tomorrow}  | ${'{date_long_pretty}'}     | ${'Tomorrow'}
      ${tomorrow}  | ${'At {date_pretty}'}       | ${'At tomorrow'}
      ${tomorrow}  | ${'At {date_short_pretty}'} | ${'At tomorrow'}
      ${tomorrow}  | ${'At {date_long_pretty}'}  | ${'At tomorrow'}
    `(
      'generates prettified fallback date "$contain" with format "$format"',
      ({ datetime, format, contain }) => {
        expect(html(<time datetime={datetime}>{format}</time>)).toContain(
          `|${contain}>`
        )
      }
    )

    it('ignores any elements in children', () => {
      const date = new Date(Date.UTC(2019, 2, 10, 10, 0, 0))

      expect(
        html(
          <time datetime={date} fallback="fallback">
            <i>with</i> <b>text</b> <s>formatting</s>
          </time>
        )
      ).toBe('<!date^1552212000^with text formatting|fallback>')

      expect(
        html(
          <time datetime={date} fallback="fallback">
            Convert
            <br />
            line breaks
            <br />
            <br />
            to a space
          </time>
        )
      ).toBe('<!date^1552212000^Convert line breaks to a space|fallback>')

      expect(
        html(
          <time datetime={date} fallback="fallback">
            <blockquote>test</blockquote>
            <pre>test</pre>
            <code>test</code>
            <a href="https://example.com/">test</a>
          </time>
        )
      ).toBe('<!date^1552212000^testtesttesttest|fallback>')
    })

    it('integrates mrkdwn when <time> tag is linked', () => {
      expect(
        html(
          <a href="https://example.com/">
            <time datetime={1552212000} fallback="2019-03-10">
              {'{date_num}'}
            </time>
          </a>
        )
      ).toBe('<!date^1552212000^{date_num}^https://example.com/|2019-03-10>')
    })

    it('escapes brackets in contents and fallback', () => {
      // NOTE: We have to escape brackets but Slack won't decode entities in fallback.
      expect(
        html(
          <time datetime={1552212000} fallback="<2019-03-10>">
            {'<{date_num}>'}
          </time>
        )
      ).toBe('<!date^1552212000^&lt;{date_num}&gt;|&lt;2019-03-10&gt;>')
    })

    it('escapes divider in contents and fallback', () => {
      expect(
        html(
          <time datetime={1552212000} fallback="by XXX | 2019-03-10">
            by XXX | {'{date_num}'}
          </time>
        )
      ).toBe(
        '<!date^1552212000^by XXX \u01c0 {date_num}|by XXX \u01c0 2019-03-10>'
      )
    })
  })
})
