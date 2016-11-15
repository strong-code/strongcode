class TodayController < ApplicationController
  before_filter :api_authenticate
  def show
    @media = media_for_today
    @jes = JournalEntry.for_today
    @weight = Weight.last.weight
  end


  private

  def media_for_today
    media = []
    path  = 'public/media/p'

    Dir.foreach(path) do |f|
      next if f == '.'
      f = path + '/' + f
      media << f[6..-1] if File.mtime(f).to_datetime.today?
    end

    media
  end
end
