/* eslint-disable no-eval */
/* eslint-disable no-unused-vars */
const { EmbedBuilder } = require('discord.js');
const { inspect } = require('util');
const Command = require('../../base/Command.js');
const { clean } = require('../../util/Util.js');

class Eval extends Command {
  constructor (client) {
    super(client, {
      name: 'eval',
      description: 'Evaluates arbitrary Javascript.',
      category: 'Owner',
      usage: 'eval <expression>',
      aliases: ['ev'],
      permLevel: 'Bot Owner'
    });
  }

  async run (msg, args, level) {
    const db = require('quick.db');
    const DiscordJS = require('discord.js');
    const Util = require('../../util/Util.js');
    const server = msg.guild;
    const member = msg.member;
    const config = this.client.config;

    const embed = new EmbedBuilder()
      .setFooter({ text: msg.author.tag, iconURL: msg.author.displayAvatarURL() });

    const query = args.join(' ');
    const code = (lang, code) => (`\`\`\`${lang}\n${String(code).slice(0, 4000) + (code.length >= 4000 ? '...' : '')}\n\`\`\``);

    if (!query) msg.channel.send('Please, write something so I can evaluate!');
    else {
      try {
        const evald = eval(query);
        const res = typeof evald === 'string' ? evald : inspect(evald, { depth: 0 });
        const res2 = await clean(this.client, res);

        embed.setDescription(`Result \n ${code('js', res2)}`);

        if (!res || (!evald && evald !== 0)) embed.setColor('#FF0000');
        else {
          embed
            .addFields([{ name: 'Type', value: code('css', typeof evald) }])
            .setColor('#00FF00');
        }
      } catch (error) {
        embed
          .addFields([{ name: 'Error', value: code('js', error) }])
          .setColor('#FF0000');
      } finally {
        msg.channel.send({ embeds: [embed] }).catch(error => {
          msg.channel.send(`There was an error while displaying the eval result! ${error.message}`);
        });
      }
    }
  }
}

module.exports = Eval;
