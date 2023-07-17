/* eslint-disable no-eval */
/* eslint-disable no-unused-vars */
const { EmbedBuilder } = require('discord.js');
const { inspect } = require('util');

// Set guildOnly to true if you want it to be available on guilds only.
// Otherwise false is global.
exports.conf = {
  permLevel: 'Bot Owner',
  guildOnly: false,
};

exports.commandData = {
  name: 'eval',
  description: 'Evaluate arbitrary JavaScript.',
  options: [
    {
      type: 3,
      name: 'query',
      description: 'The code you want to evaluate.',
      required: true,
    },
  ],
  dmPermission: true,
};

exports.run = async (client, interaction) => {
  await interaction.deferReply();

  const db = require('quick.db');
  const DiscordJS = require('discord.js');
  const util = client.util;
  const config = client.config;
  let promise = false;

  const authorName = interaction.user.discriminator === '0' ? interaction.user.username : interaction.user.tag;
  const embed = new EmbedBuilder().setFooter({
    text: authorName,
    iconURL: interaction.user.displayAvatarURL(),
  });

  const code = (lang, code) =>
    `\`\`\`${lang}\n${String(code).slice(0, 4000) + (code.length >= 4000 ? '...' : '')}\n\`\`\``;

  const query = interaction.options.get('query').value;

  try {
    let evald = eval(query);
    if (evald instanceof Promise) {
      evald = await evald;
      promise = true;
    }
    const res = typeof evald === 'string' ? evald : inspect(evald, { depth: 0 });
    const res2 = await util.clean(client, res);

    embed.setDescription(`Result ${promise ? '(Promise Awaited)' : ''} \n${code('js', res2)}`);

    if (!res || (!evald && evald !== 0)) embed.setColor(interaction.settings.embedErrorColor);
    else {
      embed
        .addFields([{ name: 'Type', value: code('css', typeof evald) }])
        .setColor(interaction.settings.embedSuccessColor);
    }
  } catch (error) {
    embed.addFields([{ name: 'Error', value: code('js', error) }]).setColor(interaction.settings.embedErrorColor);
  } finally {
    interaction.editReply({ embeds: [embed] }).catch((error) => {
      console.error(error);
    });
  }
};
