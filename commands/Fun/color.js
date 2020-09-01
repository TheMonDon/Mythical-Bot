const Command = require('../../base/Command.js');
const { MessageEmbed } = require('discord.js');
const isImageURL = require('is-image-url');
const isURL = require('is-url');
const rgbHex = require('rgb-hex');
const convert = require('color-convert');
const { getColorFromURL } = require('color-thief-node');
const { stripIndent } = require('common-tags');

class Stats extends Command {
  constructor (client) {
    super(client, {
      name: 'color',
      description: 'Get information about some colors.',
      category: 'Fun',
      usage: 'color <hex, rgb, name, imageURL>',
    });
  }

  async run (msg, args, level) { // eslint-disable-line no-unused-vars
    let input = args.join(' ');
    let color;
    const embed = new MessageEmbed();
    embed.setAuthor(msg.member.displayName, msg.author.displayAvatarURL());
  
    const rgbRegex = new RegExp(/^rgb[\s+]?\((:?\d+\.?\d?%?)(,|-|\/\|)\s?(:?\d+\.?\d?%?)(,|-|\/\|)\s?(:?\d+\.?\d?%?)\)/i);
    const hexRegex = new RegExp('(^(#|0x)?([a-fA-F0-9]){6}$)|(^(#|0x)?([a-fA-F0-9]){3}$)');
    const cssRegex = new RegExp('^[a-zA-Z]+$');
  
    if (isURL(input)) {
      if (isImageURL(input)) {
        const rgb = await getColorFromURL(input);
        input = rgbHex(rgb.join(','));
        embed.setTitle('Dominant Color From Image');
      }
    }
  
    if (rgbRegex.test(input)) {
      input = input.trim()
        .replace('rgb(', '')
        .replace(')', '');
      input = input.replace('/\s/g', '');
      input = input.split(',');
  
      try {
        color = {
          'css': convert.rgb.keyword(input),
          'hex': convert.rgb.hex(input),
          'hsl': convert.rgb.hsl(input),
          'cmyk': convert.rgb.cmyk(input),
          'rgb': input
        };
      } catch (err) {
        const rand = '000000'.replace(/0/g, function () {
          return (~~(Math.random() * 16))
            .toString(16);
        });
        embed.setTitle('Invalid color, random one assigned:');
  
        color = {
          'css': convert.hex.keyword(rand),
          'rgb': convert.hex.rgb(rand),
          'hsl': convert.hex.hsl(rand),
          'cmyk': convert.hex.cmyk(rand),
          'hex': rand
        };
      }
    } else if (hexRegex.test(input)) {
      input = input.toUpperCase();
      if (input.charAt() == '#') {
        input = input.substr(1);
      } else if (input.charAt() == '0' && input.charAt(1) == 'X') {
        input = input.substr(2);
      }
  
      if (input.length == '3') {
        input = input.slice();
        const pos1 = input[0];
        const pos2 = input[1];
        const pos3 = input[2];
        input = pos1 + pos1 + pos2 + pos2 + pos3 + pos3;
      }
  
      try {
        color = {
          'css': convert.hex.keyword(input),
          'rgb': convert.hex.rgb(input),
          'hsl': convert.hex.hsl(input),
          'cmyk': convert.hex.cmyk(input),
          'hex': input
        };
      } catch (err) {
        const rand = '000000'.replace(/0/g, function () {
          return (~~(Math.random() * 16))
            .toString(16);
        });
        embed.setTitle('Invalid color, random one assigned:');
  
        color = {
          'css': convert.hex.keyword(rand),
          'rgb': convert.hex.rgb(rand),
          'hsl': convert.hex.hsl(rand),
          'cmyk': convert.hex.cmyk(rand),
          'hex': rand
        };
      }
    } else if (cssRegex.test(input)) {
      if (input == 'random') {
        const rand = '000000'.replace(/0/g, function () {
          return (~~(Math.random() * 16))
            .toString(16);
        });
        embed.setTitle('Random Color');
  
        color = {
          'css': convert.hex.keyword(rand),
          'rgb': convert.hex.rgb(rand),
          'hsl': convert.hex.hsl(rand),
          'cmyk': convert.hex.cmyk(rand),
          'hex': rand
        };
      } else {
        try {
          while (input.length < 2) {
            if (input === 'r') {
              input = 'red';
              break;
            } else if (input === 'g') {
              input = 'green';
              break;
            } else if (input === 'b') {
              input = 'blue';
              break;
            } else {
              break;
            }
          }
          color = {
            'hex': convert.keyword.hex(input),
            'rgb': convert.keyword.rgb(input),
            'hsl': convert.keyword.hsl(input),
            'cmyk': convert.keyword.cmyk(input),
            'css': input
          };
        } catch (err) {
          const rand = '000000'.replace(/0/g, function () {
            return (~~(Math.random() * 16))
              .toString(16);
          });
          embed.setTitle('Invalid color, random one assigned:');
  
          color = {
            'css': convert.hex.keyword(rand),
            'rgb': convert.hex.rgb(rand),
            'hsl': convert.hex.hsl(rand),
            'cmyk': convert.hex.cmyk(rand),
            'hex': rand
          };
        }
      }
    } else {
      const rand = '000000'.replace(/0/g, function () {
        return (~~(Math.random() * 16))
          .toString(16);
      });
      embed.setTitle('Invalid color, random one assigned:');
  
      color = {
        'css': convert.hex.keyword(rand),
        'rgb': convert.hex.rgb(rand),
        'hsl': convert.hex.hsl(rand),
        'cmyk': convert.hex.cmyk(rand),
        'hex': rand
      };
    }
    //Formatting RGB
    let rgb = JSON.stringify(color.rgb)
      .slice(1, -1);
    rgb = rgb.replace(/['"]+/g, '')
      .split(',')
      .join(', ');
  
    //Formatting cmyk
    let cmyk = JSON.stringify(color.cmyk)
      .slice(1, -1);
    cmyk = cmyk.split(',')
      .join('%, ') + '%';
  
    //Formatting hsl
    const str = JSON.stringify(color.hsl)
      .slice(1, -1);
    const h = str.split(',')[0];
    const s = str.split(',')[1];
    const l = str.split(',')[2];
    const hsl = h + ', ' + s + '%, ' + l + '%';
  
    //Getting originals back
    const css = JSON.stringify(color.css)
      .slice(1, -1);
    const hex = JSON.stringify(color.hex)
      .slice(1, -1)
      .toUpperCase();
  
    //Saving color again
    color = {
      'css': css,
      'hex': hex,
      'rgb': rgb,
      'cmyk': cmyk,
      'hsl': hsl
    };
  
    if (!embed.title) embed.setTitle('Color Information');
    embed.setThumbnail(`https://dummyimage.com/100x100/${color.hex}.png&text=+`);
    embed.setColor(color.hex);
    embed.setDescription(stripIndent(`
          **Name:** ${color.css}
          **Hex:** #${color.hex}
          **Rgb:** rgb(${color.rgb})
          **Hsl:** hsl(${color.hsl})
          **Cmyk:** cmyk(${color.cmyk})
          `));
    msg.channel.send(embed);
  }
}

module.exports = Stats;
