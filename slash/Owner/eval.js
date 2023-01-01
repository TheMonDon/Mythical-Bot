/* eslint-disable no-eval */
/* eslint-disable no-unused-vars */
const { EmbedBuilder } = require('discord.js');
const { inspect } = require('util');
const { clean } = require('../../util/Util.js');

// Set guildOnly to true if you want it to be available on guilds only.
// Otherwise false is global.
exports.conf = {
  permLevel: 'Bot Owner',
  guildOnly: false
};

exports.commandData = {
  name: 'eval',
  description: 'Evaluate arbitrary JavaScript.',
  options: [
    {
      type: 3,
      name: 'query',
      description: 'The code you want to evaluate.',
      required: true
    }
  ],
  dmPermission: true
};

exports.run = async (client, interaction) => {
  await interaction.deferReply();

  const db = require('quick.db');
  const DiscordJS = require('discord.js');
  const Util = require('../../util/Util.js');
  const server = interaction.guild;
  const member = interaction.member;
  const config = client.config;

  const embed = new EmbedBuilder()
    .setFooter({ text: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() });

  const code = (lang, code) => (`\`\`\`${lang}\n${String(code).slice(0, 4000) + (code.length >= 4000 ? '...' : '')}\n\`\`\``);

  const query = interaction.options.get('query').value;

  try {
    const evald = eval(query);
    const res = typeof evald === 'string' ? evald : inspect(evald, { depth: 0 });
    const res2 = await clean(client, res);

    embed.setDescription(`Result \n ${code('js', res2)}`);

    if (!res || (!evald && evald !== 0)) embed.setColor(interaction.settings.embedErrorColor);
    else {
      embed
        .addFields([{ name: 'Type', value: code('css', typeof evald) }])
        .setColor(interaction.settings.embedSuccessColor);
    }
  } catch (error) {
    embed
      .addFields([{ name: 'Error', value: code('js', error) }])
      .setColor(interaction.settings.embedErrorColor);
  } finally {
    interaction.editReply({ embeds: [embed] })
      .catch(error => {
        console.error(error);
      });
  }
};
