Rails.application.routes.draw do
  devise_for :users
  root to: 'home#index'

  get 'today', to: 'today#show'
  get 'health', to: 'health#index'

  resources :journal_entries
  resource :media, only: [:create, :destroy]
  resources :weights, only: [:new, :create]
  resources :notes
end
