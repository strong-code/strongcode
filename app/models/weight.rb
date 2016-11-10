class Weight < ActiveRecord::Base

  def self.for_today
    today = Date.new
    Weight.where(date: today).first
  end

end
