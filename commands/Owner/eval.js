/* eslint-disable no-eval */
/* eslint-disable no-unused-vars */
const { MessageEmbed } = require('discord.js');
const { inspect } = require('util');
const Command = require('../../base/Command.js');

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
    const Util = require('../../base/Util.js');
    const server = msg.guild;
    const member = msg.member;

    const embed = new MessageEmbed()
      .setFooter(msg.author.tag, msg.author.displayAvatarURL());

    const query = args.join(' ');
    const code = (lang, code) => (`\`\`\`${lang}\n${String(code).slice(0, 4000) + (code.length >= 4000 ? '...' : '')}\n\`\`\``).replace(this.client.config.token, '*'.repeat(this.client.config.token.length)).replace(this.client.config.github, '*'.repeat(this.client.config.github.length)).replace(this.client.config.owlKey, '*'.repeat(this.client.config.owlKey.length));

    if (!query) msg.channel.send('Please, write something so I can evaluate!');
    else {
      try {
        const evald = eval(query);
        const res = typeof evald === 'string' ? evald : inspect(evald, { depth: 0 });

        embed.setDescription(`Result \n ${code('js', res)}`);

        if (!res || (!evald && evald !== 0)) embed.setColor('RED');
        else {
          embed
            .addField('Type', code('css', typeof evald))
            .setColor('GREEN');
        }
      } catch (error) {
        embed
          .addField('Error', code('js', error))
          .setColor('RED');
      } finally {
        msg.channel.send({ embeds: [embed] }).catch(error => {
          msg.channel.send(`There was an error while displaying the eval result! ${error.message}`);
        });
      }
    }
  }
}

module.exports = Eval;
