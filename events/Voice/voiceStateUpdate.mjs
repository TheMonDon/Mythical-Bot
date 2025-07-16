import { EmbedBuilder } from 'discord.js';

export async function run(client, oldState, newState) {
  const botVoiceChannel = newState.guild.members.me.voice.channel;
  if (!botVoiceChannel) return; // Bot not in VC

  const player = client.lavalink.players.get(newState.guild.id);
  if (!player) return;

  const settings = client.getSettings(newState.guild);

  // Check if someone LEFT the bot's VC
  if (oldState.channelId === botVoiceChannel.id && oldState.channelId !== newState.channelId) {
    const nonBotMembers = botVoiceChannel.members.filter((m) => !m.user.bot);
    if (nonBotMembers.size === 0 && !player.paused) {
      await player.pause();

      const embed = new EmbedBuilder()
        .setColor(settings.embedErrorColor)
        .setDescription(`Playback paused in <#${botVoiceChannel.id}> because the voice channel is empty.`)
        .setTimestamp();

      player.textChannelId &&
        client.channels.cache
          .get(player.textChannelId)
          ?.send({ embeds: [embed] })
          .catch(() => {});
    }
  }

  // Check if someone JOINED the bot's VC
  if (newState.channelId === botVoiceChannel.id && oldState.channelId !== newState.channelId) {
    const nonBotMembers = botVoiceChannel.members.filter((m) => !m.user.bot);
    if (nonBotMembers.size > 0 && player.paused) {
      await player.resume();

      const embed = new EmbedBuilder()
        .setColor(settings.embedSuccessColor)
        .setDescription(`Playback resumed in <#${botVoiceChannel.id}>.`)
        .setTimestamp();

      player.textChannelId &&
        client.channels.cache
          .get(player.textChannelId)
          ?.send({ embeds: [embed] })
          .catch(() => {});
    }
  }
}
