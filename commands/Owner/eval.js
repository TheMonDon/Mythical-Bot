/* eslint-disable no-eval */
/* eslint-disable no-unused-vars */
const Command = require('../../base/Command.js');
const { EmbedBuilder } = require('discord.js');
const { inspect } = require('util');
const { QuickDB } = require('quick.db');

class Eval extends Command {
  constructor(client) {
    super(client, {
      name: 'eval',
      description: 'Evaluates arbitrary Javascript.',
      category: 'Owner',
      permLevel: 'Bot Owner',
      usage: 'eval <expression>',
      aliases: ['ev'],
    });
  }

  async run(msg, args, level) {
    const DiscordJS = require('discord.js');
    const db = new QuickDB();
    const util = this.client.util;
    let promise = false;

    const authorName = msg.author.discriminator === '0' ? msg.author.username : msg.author.tag;
    const embed = new EmbedBuilder().setFooter({ text: authorName, iconURL: msg.author.displayAvatarURL() });

    const query = args.join(' ');
    const code = (lang, code) =>
      `\`\`\`${lang}\n${String(code).slice(0, 4000) + (code.length >= 4000 ? '...' : '')}\n\`\`\``;

    if (!query) return msg.channel.send('Please, write something so I can evaluate!');

    try {
      let evald = eval(query);
      if (evald instanceof Promise) {
        evald = await evald;
        promise = true;
      }
      const res = typeof evald === 'string' ? evald : inspect(evald, { depth: 0 });
      const res2 = await util.clean(this.client, res);

      embed.setDescription(`Result ${promise ? '(Promise Awaited)' : ''} \n${code('js', res2)}`);

      if (!res || (!evald && evald !== 0)) embed.setColor(msg.settings.embedErrorColor);
      else {
        embed.addFields([{ name: 'Type', value: code('css', typeof evald) }]).setColor(msg.settings.embedSuccessColor);
      }
    } catch (error) {
      console.log(error);
      embed.addFields([{ name: 'Error', value: code('js', error) }]).setColor(msg.settings.embedErrorColor);
    } finally {
      msg.channel.send({ embeds: [embed] }).catch((error) => {
        msg.channel.send(`There was an error while displaying the eval result! ${error.message}`);
      });
    }
  }
}

module.exports = Eval;
