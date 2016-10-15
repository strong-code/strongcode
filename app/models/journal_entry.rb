class JournalEntry < ActiveRecord::Base
  belongs_to :user
  
  def self.for(date, user)
    return where(user_id: user.id) if date.nil?

    d = Date.parse(date)
    where(created_at: d.midnight..d.end_of_day, user_id: user.id)
  end

  def self.for_today
    where("created_at >= ?", Time.zone.now.beginning_of_day)
  end

end
