const Command = require('../../base/Command.js');
const { EmbedBuilder } = require('discord.js');
const isImageURL = require('is-image-url');
const isURL = require('is-url');
const rgbHex = require('rgb-hex');
const convert = require('color-convert');
const { getColorFromURL } = require('color-thief-node');
const { stripIndent } = require('common-tags');
const colorNameList = require('color-name-list');

class Color extends Command {
  constructor (client) {
    super(client, {
      name: 'color',
      description: 'Get information about some colors.',
      usage: 'color <hex, rgb, name, imageURL, attachment>',
      category: 'Fun'
    });
  }

  async run (msg, args) {
    let input = args.join(' ');
    let color;

    // Create the embed
    const embed = new EmbedBuilder()
      .setAuthor({ name: msg.author.username, iconURL: msg.author.displayAvatarURL() });

    const rgbRegex = /^rgb[\s+]?\((:?\d+\.?\d?%?)(,|-|\/\|)\s?(:?\d+\.?\d?%?)(,|-|\/\|)\s?(:?\d+\.?\d?%?)\)/i;
    const hexRegex = /(^(#|0x)?([a-fA-F0-9]){6}$)|(^(#|0x)?([a-fA-F0-9]){3}$)/;
    const cssRegex = /^[a-zA-Z]+$/;

    // Get the nearest color from an extra list of colors
    const extraColors = colorNameList.reduce((o, { name, hex }) => Object.assign(o, { [name.toLowerCase()]: hex }), {});
    if (extraColors[input.toString().toLowerCase()]) input = extraColors[input.toString().toLowerCase()];
    const nearestColor = require('nearest-color').from(extraColors);

    // If there is a message attachment, set the input to the attachment url
    if (msg.attachments.first()) input = msg.attachments.first().url;

    // Check if the input is an image url
    if (isURL(input)) {
      if (isImageURL(input)) {
        // Get the RGB color from the image and convert it to hex
        const rgb = await getColorFromURL(input);
        input = rgbHex(rgb.join(','));
        embed.setTitle('Dominant Color From Image');
      }
    }

    // Test if the input is an RGB color
    if (rgbRegex.test(input)) {
      input = input.trim()
        .replace('rgb(', '')
        .replace(')', '');
      input = input.replace(/\s/g, '');
      input = input.split(',');

      try {
        color = {
          css: nearestColor(convert.rgb.hex(input)).name,
          hex: convert.rgb.hex(input),
          hsl: convert.rgb.hsl(input),
          cmyk: convert.rgb.cmyk(input),
          rgb: input
        };
      } catch (err) {
        const rand = '000000'.replace(/0/g, function () {
          return (~~(Math.random() * 16))
            .toString(16);
        });
        embed.setTitle('Invalid color, random one assigned:');

        color = {
          css: nearestColor(rand).name,
          rgb: convert.hex.rgb(rand),
          hsl: convert.hex.hsl(rand),
          cmyk: convert.hex.cmyk(rand),
          hex: rand
        };
      }
    } else if (hexRegex.test(input)) { // Test if the input is a hex color
      input = input.toUpperCase();
      if (input.charAt() === '#') {
        input = input.substr(1);
      } else if (input.charAt() === '0' && input.charAt(1) === 'X') {
        input = input.substr(2);
      }

      if (input.length === '3') {
        input = input.slice();
        const pos1 = input[0];
        const pos2 = input[1];
        const pos3 = input[2];
        input = pos1 + pos1 + pos2 + pos2 + pos3 + pos3;
      }

      try {
        color = {
          css: nearestColor(input).name,
          rgb: convert.hex.rgb(input),
          hsl: convert.hex.hsl(input),
          cmyk: convert.hex.cmyk(input),
          hex: input
        };
      } catch (err) {
        const rand = '000000'.replace(/0/g, function () {
          return (~~(Math.random() * 16))
            .toString(16);
        });
        embed.setTitle('Invalid color, random one assigned:');

        color = {
          css: nearestColor(rand).name,
          rgb: convert.hex.rgb(rand),
          hsl: convert.hex.hsl(rand),
          cmyk: convert.hex.cmyk(rand),
          hex: rand
        };
      }
    } else if (cssRegex.test(input)) { // Test if the input is a text color
      if (input === 'random') {
        const rand = '000000'.replace(/0/g, function () {
          return (~~(Math.random() * 16)).toString(16);
        });
        embed.setTitle('Random Color');

        color = {
          css: nearestColor(rand).name,
          rgb: convert.hex.rgb(rand),
          hsl: convert.hex.hsl(rand),
          cmyk: convert.hex.cmyk(rand),
          hex: rand
        };
      } else {
        try {
          if (input.length < 2) {
            if (input === 'r') input = 'red';
            if (input === 'g') input = 'green';
            if (input === 'b') input = 'blue';
          }

          color = {
            hex: convert.keyword.hex(input),
            rgb: convert.keyword.rgb(input),
            hsl: convert.keyword.hsl(input),
            cmyk: convert.keyword.cmyk(input),
            css: nearestColor(input).name
          };
        } catch (err) {
          const rand = '000000'.replace(/0/g, function () {
            return (~~(Math.random() * 16)).toString(16);
          });
          embed.setTitle('Invalid color, random one assigned:');

          color = {
            css: nearestColor(rand).name,
            rgb: convert.hex.rgb(rand),
            hsl: convert.hex.hsl(rand),
            cmyk: convert.hex.cmyk(rand),
            hex: rand
          };
        }
      }
    } else { // If the input is not a color, assign a random color
      const rand = '000000'.replace(/0/g, function () {
        return (~~(Math.random() * 16)).toString(16);
      });
      embed.setTitle('Invalid color, random one assigned:');

      color = {
        css: nearestColor(rand).name,
        rgb: convert.hex.rgb(rand),
        hsl: convert.hex.hsl(rand),
        cmyk: convert.hex.cmyk(rand),
        hex: rand
      };
    }

    // Formatting RGB
    let rgb = JSON.stringify(color.rgb)
      .slice(1, -1);
    rgb = rgb.replace(/['"]+/g, '')
      .split(',')
      .join(', ');

    // Formatting cmyk
    let cmyk = JSON.stringify(color.cmyk)
      .slice(1, -1);
    cmyk = cmyk.split(',')
      .join('%, ') + '%';

    // Formatting hsl
    const str = JSON.stringify(color.hsl)
      .slice(1, -1);
    const h = str.split(',')[0];
    const s = str.split(',')[1];
    const l = str.split(',')[2];
    const hsl = h + ', ' + s + '%, ' + l + '%';

    // Getting originals back
    const css = JSON.stringify(color.css)
      .slice(1, -1);
    const hex = JSON.stringify(color.hex)
      .slice(1, -1)
      .toUpperCase();

    // Saving color again
    color = {
      css,
      hex,
      rgb,
      cmyk,
      hsl
    };

    if (!embed.title) embed.setTitle('Color Information');

    embed
      .setThumbnail(`https://dummyimage.com/100x100/${color.hex}.png&text=+`)
      .setColor(color.hex)
      .setDescription(stripIndent(`
        **Name:** ${this.client.util.toProperCase(color.css)}
        **Hex:** #${color.hex}
        **Rgb:** rgb(${color.rgb})
        **Hsl:** hsl(${color.hsl})
        **Cmyk:** cmyk(${color.cmyk})
      `));

    return msg.channel.send({ embeds: [embed] });
  }
}

module.exports = Color;
