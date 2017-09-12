import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import htmlparser from 'htmlparser2-without-node-native';
import entities from 'entities';

import AutoSizedImage from './AutoSizedImage';

const defaultOpts = {
  lineBreak: '\n',
  paragraphBreak: '\n\n',
  bullet: '\u2022 ',
  TextComponent: Text,
  textComponentProps: null,
  NodeComponent: View,
  nodeComponentProps: null,
};

const Img = props => {
  const width =
    parseInt(props.attribs['width'], 10) || parseInt(props.attribs['data-width'], 10) || 0;
  const height =
    parseInt(props.attribs['height'], 10) ||
    parseInt(props.attribs['data-height'], 10) ||
    0;

  const imgStyle = {
    width,
    height,
  };

  const source = {
    uri: props.attribs.src,
    width,
    height,
  };
  return <AutoSizedImage source={source} style={imgStyle} />;
};

export default function htmlToElement(rawHtml, customOpts = {}, done) {
  const styles1 = StyleSheet.create({

      column: {
        flexDirection: 'column',
        alignItems: 'flex-start',
        width: 280,
        height: 50, // height: controls overall height of bullet combos
        flex: -1,
      },

      row: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        //width: 250,
        //height: 50,
        //flexWrap: 'wrap',
        //flex: 1,
      //  marginBottom: 30,
      },

      bulletView: {
        flex: 1,
        width: 4,
        marginLeft: 10,
      },

      bullet: {
        color: 'white',
      },

      bulletTextView: {
        flex: 1,
        marginBottom: 70,
        width: 272,
        height: 240,
        marginLeft: -2,
      },

    });

  const opts = {
    ...defaultOpts,
    ...customOpts,
  };

  function inheritedStyle(parent) {
    if (!parent) return null;
    const style = StyleSheet.flatten(opts.styles[parent.name]) || {};
    const parentStyle = inheritedStyle(parent.parent) || {};
    return {...parentStyle, ...style};
  }

  function domToElement(dom, parent) {
    if (!dom) return null;

    const renderNode = opts.customRenderer;
    let orderedListCounter = 1;

    return dom.map((node, index, list) => {
      if (renderNode) {
        const rendered = renderNode(
          node,
          index,
          list,
          parent,
          domToElement
        );
        if (rendered || rendered === null) return rendered;
      }

      const {TextComponent} = opts;

      if (node.type === 'text') {
        const defaultStyle = opts.textComponentProps ? opts.textComponentProps.style : null;
        const customStyle = inheritedStyle(parent);

        if (parent.name === 'li') {
          //console.log(node);

          return (
            <TextComponent
              {...opts.textComponentProps}
              key={index}
              style={[defaultStyle, customStyle]}
            >
              {entities.decodeHTML(node.data)}
              {opts.lineBreak}
            </TextComponent>
          );
        }

        //console.log(node);
        return (
          <TextComponent
            {...opts.textComponentProps}
            key={index}
            style={[defaultStyle, customStyle]}
          >
            {entities.decodeHTML(node.data)}
          </TextComponent>
        );
      }

      if (node.type === 'tag') {
        //console.log(node);
        if (node.name === 'img') {
          return <Img key={index} attribs={node.attribs} />;
        }

        let linkPressHandler = null;
        let linkLongPressHandler = null;
        if (node.name === 'a' && node.attribs && node.attribs.href) {
          linkPressHandler = () =>
            opts.linkHandler(entities.decodeHTML(node.attribs.href));
          if (opts.linkLongPressHandler) {
            linkLongPressHandler = () =>
              opts.linkLongPressHandler(entities.decodeHTML(node.attribs.href));
          }
        }

        let linebreakBefore = null;
        let linebreakAfter = null;
        if (opts.addLineBreaks) {
          switch (node.name) {
          case 'b':
            break;
          case 'pre':
            linebreakBefore = opts.lineBreak;
            break;
          case 'p':
            if (index < list.length - 1) {
              linebreakAfter = opts.paragraphBreak;
            }
            break;
          case 'br':
          case 'h1':
          case 'h2':
          case 'h3':
          case 'h4':
          case 'h5':
            linebreakAfter = opts.lineBreak;
            break;
          }
        }

        let listItemPrefix = null;
        if (node.name === 'li') {
          const defaultStyle = opts.textComponentProps ? opts.textComponentProps.style : null;
          const customStyle = inheritedStyle(parent);
          console.log(node);
          if (parent.name === 'ol') {
            listItemPrefix = (<TextComponent style={[defaultStyle, customStyle]}>
              {`${orderedListCounter++}. `}
            </TextComponent>);
          } else if (parent.name === 'ul') {
            listItemPrefix = (<TextComponent style={[defaultStyle, customStyle, styles1.bullet]}>
              {opts.bullet}
            </TextComponent>);
          }
          linebreakAfter = opts.lineBreak;

          const {NodeComponent, styles} = opts;

          return (
            <NodeComponent
              {...opts.nodeComponentProps}
              key={index}
              onPress={linkPressHandler}
              style={!node.parent ? styles[node.name] : null}
              onLongPress={linkLongPressHandler}
            >
              <View style={styles1.row}>
              {listItemPrefix}
              {domToElement(node.children, node)}
            </View>
            </NodeComponent>
          );
        }

        const {NodeComponent, styles} = opts;

        if (node.name === 'p' || node.name === 'b' || node.name === 'h3') {
        return (
          <TextComponent
            {...opts.nodeComponentProps}
            key={index}
            onPress={linkPressHandler}
            style={!node.parent ? styles[node.name] : null}
            onLongPress={linkLongPressHandler}
          >
            {/* <TextComponent> */}
            {domToElement(node.children, node)}
            {/* </TextComponent> */}
          </TextComponent>
        );
      }

        return (
          <NodeComponent
            {...opts.nodeComponentProps}
            key={index}
            onPress={linkPressHandler}
            style={!node.parent ? styles[node.name] : null}
            onLongPress={linkLongPressHandler}
          >
            {domToElement(node.children, node)}
          </NodeComponent>
        );
      }
    });
  }

  const handler = new htmlparser.DomHandler(function(err, dom) {
    if (err) done(err);
    done(null, domToElement(dom));
  });
  const parser = new htmlparser.Parser(handler);
  parser.write(rawHtml);
  parser.done();
}
